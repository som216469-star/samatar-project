import express from "express";
import crypto from "crypto";
import { sendTeacherInvitationEmail } from "./emailService.ts";
import {
  generateSecureToken,
  validatePassword,
  getAuthenticatedUser,
  hashPassword
} from "./authSession.ts";


function getBaseAppUrl(req: express.Request): string {
  if (process.env.APP_URL && process.env.APP_URL.startsWith("http")) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const host = req.get("host") || "localhost:3000";
  return `${protocol}://${host}`;
}

export function registerTeacherAuthRoutes(
  app: express.Application,
  dependencies: {
    loadLocalDB: () => any;
    saveLocalDB: (data: any) => void;
    supabase: any;
    getUseLocalFallback: () => boolean;
  }
) {
  const { loadLocalDB, saveLocalDB, supabase, getUseLocalFallback } = dependencies;

  /**
   * GET /api/teachers/verify-invitation/:token
   * Verifies an activation token without activating yet.
   */
  app.get("/api/teachers/verify-invitation/:token", async (req, res) => {
    const { token } = req.params;
    if (!token || token.length < 16) {
      return res.status(400).json({ valid: false, error: "Link-ga casuumaaddu ma shaqeynayo (Invalid token)." });
    }

    const db = loadLocalDB();
    const teacher = (db.teachers || []).find((t: any) => t.invitationToken === token);

    if (!teacher) {
      // Check Supabase if connected
      if (!getUseLocalFallback() && supabase) {
        try {
          const { data, error } = await supabase
            .from("dugsiga_teachers")
            .select("*")
            .eq("invitation_token", token)
            .maybeSingle();

          if (!error && data) {
            const isExpired = data.invitation_expires_at && new Date(data.invitation_expires_at) < new Date();
            if (isExpired) {
              return res.status(400).json({ valid: false, error: "Casuumaaddani way dhacday. Fadlan la xiriir maamulka iskuulka." });
            }
            if (data.status === "ACTIVE") {
              return res.status(400).json({ valid: false, error: "Akoonkan horey ayaa loo dhaqaajiyey. Fadlan 'Login' ku gal." });
            }
            return res.json({
              valid: true,
              teacherName: data.name,
              email: data.email,
              schoolId: data.school_id,
              status: data.status || "INVITED"
            });
          }
        } catch (sbErr) {
          console.warn("Supabase invitation verify notice:", sbErr);
        }
      }

      return res.status(400).json({
        valid: false,
        error: "Casuumaad lama helin ama horey ayaa loo isticmaalay. Fadlan la xiriir maamulka iskuulka."
      });
    }

    // Check expiration
    if (teacher.invitationExpiresAt && new Date(teacher.invitationExpiresAt) < new Date()) {
      return res.status(400).json({
        valid: false,
        error: "Casuumaaddani way dhacday (Invitation expired). Fadlan weydiiso maamulka in laguu soo cusboonaysiiyo."
      });
    }

    if (teacher.status === "ACTIVE") {
      return res.status(400).json({
        valid: false,
        error: "Akoonkan horey ayaa loo dhaqaajiyey. Fadlan gal adigoo isticmaalaya email-kaaga iyo password-kaaga."
      });
    }

    const schoolSettings = db.settings || {};
    return res.json({
      valid: true,
      teacherName: teacher.name,
      email: teacher.email,
      schoolId: teacher.schoolId,
      schoolName: schoolSettings.schoolName || "Dugsiga Pro 2026",
      status: teacher.status || "INVITED"
    });
  });

  /**
   * POST /api/teachers/activate-account
   * Teacher creates their password and activates the account.
   * Zero-trust: password is encrypted, token is permanently invalidated.
   */
  app.post("/api/teachers/activate-account", async (req, res) => {
    if (process.env.NODE_ENV === "production" && (getUseLocalFallback() || !supabase)) {
      return res.status(503).json({ error: "Adeegga dhaqaajinta akoonka macallinka si ku-meel-gaar ah uma shaqaynayo." });
    }

    const { token, password, confirmPassword } = req.body || {};
    if (typeof token !== "string" || token.length < 32 || token.length > 512) {
      return res.status(400).json({ error: "Token-ka casuumaaddu ma saxna." });
    }
    if (typeof password !== "string" || password !== confirmPassword) {
      return res.status(400).json({ error: "Labada password isma laha. Fadlan hubi." });
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const db = loadLocalDB();
    let teacher: any = null;
    let localTeacherIndex = -1;
    const nowIso = new Date().toISOString();

    // In cloud mode, only the current database invitation may authorize activation;
    // never trust a stale local mirror after an invite was used or revoked.
    if (!getUseLocalFallback() && supabase) {
      const { data, error } = await supabase
        .from("dugsiga_teachers")
        .select("*")
        .eq("invitation_token", token)
        .eq("status", "INVITED")
        .gt("invitation_expires_at", nowIso)
        .maybeSingle();

      if (error) {
        console.warn("Teacher invitation lookup failed:", error.message);
        return res.status(503).json({ error: "Casuumaadda lama xaqiijin karin hadda. Fadlan mar kale isku day." });
      }
      teacher = data;
      if (teacher) {
        teacher = {
          ...teacher,
          schoolId: teacher.school_id,
          teacherId: teacher.teacher_id,
          invitationToken: token,
          invitationExpiresAt: teacher.invitation_expires_at,
          assignedClasses: Array.isArray(teacher.assigned_classes) ? teacher.assigned_classes : [],
          assignedSubjects: Array.isArray(teacher.assigned_subjects) ? teacher.assigned_subjects : []
        };
      }
    } else {
      localTeacherIndex = (db.teachers || []).findIndex((item: any) => item.invitationToken === token);
      teacher = localTeacherIndex >= 0 ? db.teachers[localTeacherIndex] : null;
      if (teacher && (
        String(teacher.status || "INVITED").toUpperCase() !== "INVITED" ||
        !teacher.invitationExpiresAt ||
        new Date(teacher.invitationExpiresAt).getTime() <= Date.now()
      )) {
        teacher = null;
      }
    }

    if (!teacher) {
      return res.status(400).json({ error: "Casuumaad sax ah lama helin, way dhacday, ama horey ayaa loo isticmaalay." });
    }

    const cleanEmail = String(teacher.email || "").trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Email sax ah kuma xirna casuumaaddan." });
    }
    const passwordHash = await hashPassword(password);

    if (!getUseLocalFallback() && supabase) {
      // Atomically claim the invitation before writing the password. Concurrent
      // replays cannot overwrite the password chosen by the successful request.
      const { data: activatedTeacher, error: activateError } = await supabase
        .from("dugsiga_teachers")
        .update({
          status: "ACTIVE",
          invitation_token: null,
          activated_at: nowIso
        })
        .eq("id", teacher.id)
        .eq("school_id", teacher.schoolId)
        .eq("invitation_token", token)
        .eq("status", "INVITED")
        .gt("invitation_expires_at", nowIso)
        .select("id")
        .maybeSingle();

      if (activateError) {
        console.warn("Teacher activation claim failed:", activateError.message);
        return res.status(503).json({ error: "Akoonka lama dhaqaajin karin hadda. Fadlan mar kale isku day." });
      }
      if (!activatedTeacher) {
        return res.status(400).json({ error: "Casuumaaddan horey ayaa loo isticmaalay ama way dhacday." });
      }

      const { error: userError } = await supabase
        .from("dugsiga_users")
        .upsert([{
          email: cleanEmail,
          password: passwordHash,
          verified: true,
          role: "teacher",
          school_id: teacher.schoolId,
          teacher_id: teacher.id,
          password_changed_at: nowIso,
          password_reset_token_hash: null,
          password_reset_expires_at: null
        }], { onConflict: "email" });

      if (userError) {
        console.warn("Teacher login identity activation failed:", userError.message);
        // Restore the invitation only if this request still owns the activation
        // transition, so the teacher can retry without leaking a valid account.
        await supabase
          .from("dugsiga_teachers")
          .update({
            status: "INVITED",
            invitation_token: token,
            activated_at: null
          })
          .eq("id", teacher.id)
          .eq("school_id", teacher.schoolId)
          .eq("status", "ACTIVE")
          .eq("activated_at", nowIso);
        return res.status(503).json({ error: "Akoonka login-ka lama diyaarin karin hadda. Fadlan isku day mar kale." });
      }
    }

    if (!db.teachers) db.teachers = [];
    const localIndex = db.teachers.findIndex((item: any) => item.id === teacher.id);
    const normalizedTeacher = {
      ...(localIndex >= 0 ? db.teachers[localIndex] : {}),
      id: teacher.id,
      teacherId: teacher.teacherId || teacher.teacher_id || teacher.id,
      schoolId: teacher.schoolId || teacher.school_id,
      name: teacher.name,
      email: cleanEmail,
      status: "ACTIVE",
      invitationToken: null,
      invitationExpiresAt: teacher.invitationExpiresAt || teacher.invitation_expires_at,
      activatedAt: nowIso,
      invitationStatus: "ACTIVE",
      assignedClasses: Array.isArray(teacher.assignedClasses) ? teacher.assignedClasses : [],
      assignedSubjects: Array.isArray(teacher.assignedSubjects) ? teacher.assignedSubjects : []
    };
    if (localIndex >= 0) db.teachers[localIndex] = normalizedTeacher;
    else db.teachers.push(normalizedTeacher);

    if (!db.users) db.users = [];
    const userIndex = db.users.findIndex(
      (user: any) => String(user.email || "").trim().toLowerCase() === cleanEmail
    );
    const localUser = {
      email: cleanEmail,
      password_hash: passwordHash,
      verified: true,
      role: "teacher",
      school_id: teacher.schoolId || teacher.school_id,
      teacher_id: teacher.id,
      password_changed_at: nowIso,
      password_reset_token_hash: null,
      password_reset_expires_at: null
    };
    if (userIndex >= 0) db.users[userIndex] = { ...db.users[userIndex], ...localUser };
    else db.users.push(localUser);
    saveLocalDB(db);

    return res.json({
      success: true,
      message: "Hambalyo! Akoonkaaga Macallinka si buuxda ayaa loo dhaqaajiyey. Hadda waad gali kartaa.",
      email: cleanEmail
    });
  });

  /**
   * POST /api/teachers/:id/resend-invitation
   * Admin can resend invitation email to teacher with a fresh, secure one-time token.
   */
  app.post("/api/teachers/:id/resend-invitation", async (req, res) => {
    const authUser = getAuthenticatedUser(req, loadLocalDB);
    if (authUser && authUser.role === "teacher") {
      return res.status(403).json({ error: "Macallinku awood uma laha dib u diridda casuumaadaha." });
    }

    const { id } = req.params;
    const db = loadLocalDB();
    const teacherIndex = (db.teachers || []).findIndex((t: any) => t.id === id);

    if (teacherIndex === -1) {
      return res.status(404).json({ error: "Macallinka lama helin." });
    }

    const teacher = db.teachers[teacherIndex];
    if (!teacher.email || !teacher.email.includes("@")) {
      return res.status(400).json({ error: "Macallinkani ma laha email sax ah oo casuumaad loogu diro." });
    }

    const newToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const sentAt = new Date().toISOString();

    // Update in Local DB
    db.teachers[teacherIndex].invitationToken = newToken;
    db.teachers[teacherIndex].invitationExpiresAt = expiresAt;
    db.teachers[teacherIndex].invitationSentAt = sentAt;
    db.teachers[teacherIndex].status = "INVITED";
    saveLocalDB(db);

    // Update in Supabase
    if (!getUseLocalFallback() && supabase) {
      try {
        await supabase
          .from("dugsiga_teachers")
          .update({
            invitation_token: newToken,
            invitation_expires_at: expiresAt,
            status: "INVITED"
          })
          .eq("id", id);
      } catch (e) {}
    }

    const baseUrl = getBaseAppUrl(req);
    const activationLink = `${baseUrl}/activate-teacher?token=${newToken}`;
    const schoolSettings = db.settings || {};
    const schoolName = schoolSettings.schoolName || "Dugsiga Pro 2026";

    const emailResult = await sendTeacherInvitationEmail({
      toEmail: teacher.email,
      teacherName: teacher.name,
      schoolName,
      activationLink,
      expiresInDays: 7
    });

    return res.json({
      success: true,
      message: emailResult.success
        ? `Casuumaad cusub waxaa si guul leh loogu diray ${teacher.email}`
        : `Casuumaad ayaa loo sameeyay laakiin dirista email-ku waxay ku timid cillad. Link-ga tooska ah hoos kaga koobi garee.`,
      emailSent: emailResult.success,
      activationLink,
      invitationExpiresAt: expiresAt
    });
  });

  /**
   * POST /api/teachers/:id/toggle-status
   * Admin can deactivate or reactivate a teacher.
   */
  app.post("/api/teachers/:id/toggle-status", async (req, res) => {
    const authUser = getAuthenticatedUser(req, loadLocalDB);
    if (authUser && authUser.role === "teacher") {
      return res.status(403).json({ error: "Macallinku awood uma laha wax ka beddelka xaaladda macallimiinta." });
    }

    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE' | 'DEACTIVATED' | 'INACTIVE'
    const newStatus = status === "DEACTIVATED" || status === "INACTIVE" ? "DEACTIVATED" : "ACTIVE";

    const db = loadLocalDB();
    const idx = (db.teachers || []).findIndex((t: any) => t.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Macallinka lama helin." });
    }

    db.teachers[idx].status = newStatus;
    saveLocalDB(db);

    if (!getUseLocalFallback() && supabase) {
      try {
        await supabase.from("dugsiga_teachers").update({ status: newStatus }).eq("id", id);
      } catch (e) {}
    }

    return res.json({ success: true, status: newStatus });
  });
}
