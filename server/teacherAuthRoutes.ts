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

    if (!getUseLocalFallback() && supabase) {
      try {
        const { data, error } = await supabase
          .from("dugsiga_teachers")
          .select("id, school_id, name, email, status, invitation_expires_at")
          .eq("invitation_token", token)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          return res.status(400).json({
            valid: false,
            error: "Casuumaad lama helin ama horey ayaa loo isticmaalay. Fadlan la xiriir maamulka iskuulka."
          });
        }
        if (data.invitation_expires_at && new Date(data.invitation_expires_at) < new Date()) {
          return res.status(400).json({ valid: false, error: "Casuumaaddani way dhacday. Fadlan la xiriir maamulka iskuulka." });
        }
        if (String(data.status || "").toUpperCase() === "ACTIVE") {
          return res.status(400).json({ valid: false, error: "Akoonkan horey ayaa loo dhaqaajiyey. Fadlan 'Login' ku gal." });
        }
        return res.json({
          valid: true,
          teacherName: data.name,
          email: data.email,
          schoolId: data.school_id,
          status: data.status || "INVITED"
        });
      } catch (error: any) {
        console.error("Cloud invitation verification failed:", String(error?.message || error).slice(0, 180));
        return res.status(503).json({
          valid: false,
          error: "Casuumaadda lagama xaqiijin karin kaydka xogta daruurta ah. Fadlan mar kale isku day.",
          code: "DATABASE_UNAVAILABLE"
        });
      }
    }

    const db = loadLocalDB();
    const teacher = (db.teachers || []).find((item: any) => item.invitationToken === token);
    if (!teacher) {
      return res.status(400).json({
        valid: false,
        error: "Casuumaad lama helin ama horey ayaa loo isticmaalay. Fadlan la xiriir maamulka iskuulka."
      });
    }
    if (teacher.invitationExpiresAt && new Date(teacher.invitationExpiresAt) < new Date()) {
      return res.status(400).json({
        valid: false,
        error: "Casuumaaddani way dhacday (Invitation expired). Fadlan weydiiso maamulka in laguu soo cusboonaysiiyo."
      });
    }
    if (String(teacher.status || "").toUpperCase() === "ACTIVE") {
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
    const { token, password, confirmPassword } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Token-ka casuumaaddu waa khasab." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Labada password isma laha. Fadlan hubi." });
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    if (!getUseLocalFallback() && supabase) {
      try {
        const { data: cloudTeacher, error: lookupError } = await supabase
          .from("dugsiga_teachers")
          .select("id, school_id, name, email, status, invitation_token, invitation_expires_at")
          .eq("invitation_token", token)
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (!cloudTeacher) {
          return res.status(400).json({ error: "Casuumaad sax ah lama helin ama horey ayaa loo dhaqaajiyey." });
        }
        if (cloudTeacher.invitation_expires_at && new Date(cloudTeacher.invitation_expires_at) < new Date()) {
          return res.status(400).json({ error: "Casuumaaddani way dhacday. Fadlan weydiiso maamulka in laguu soo diro mid cusub." });
        }
        if (String(cloudTeacher.status || "").toUpperCase() === "ACTIVE") {
          return res.status(400).json({ error: "Akoonkan horey ayaa loo dhaqaajiyey. Fadlan Login ku gal." });
        }
        const cleanEmail = String(cloudTeacher.email || "").trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes("@") || !cloudTeacher.school_id) {
          return res.status(409).json({ error: "Xogta macallinka ama iskuulka ma dhammaystirna; maamulka ha saxo." });
        }

        const passwordHash = await hashPassword(password);
        const nowIso = new Date().toISOString();
        const { data: activatedTeacher, error: teacherUpdateError } = await supabase
          .from("dugsiga_teachers")
          .update({
            status: "ACTIVE",
            invitation_token: null,
            activated_at: nowIso
          })
          .eq("id", cloudTeacher.id)
          .eq("school_id", cloudTeacher.school_id)
          .eq("invitation_token", token)
          .select("id")
          .maybeSingle();
        if (teacherUpdateError) throw teacherUpdateError;
        if (!activatedTeacher) {
          return res.status(409).json({ error: "Casuumaadda hore ayaa la isticmaalay ama waa la beddelay. Fadlan mar kale xaqiiji." });
        }

        const { error: userUpsertError } = await supabase
          .from("dugsiga_users")
          .upsert([{
            email: cleanEmail,
            password: passwordHash,
            verified: true,
            role: "teacher",
            school_id: cloudTeacher.school_id,
            teacher_id: cloudTeacher.id
          }], { onConflict: "email" });
        if (userUpsertError) {
          // Restore the invitation so the teacher can safely retry rather than being stranded.
          const { error: rollbackError } = await supabase
            .from("dugsiga_teachers")
            .update({
              status: cloudTeacher.status || "INVITED",
              invitation_token: token,
              invitation_expires_at: cloudTeacher.invitation_expires_at,
              activated_at: null
            })
            .eq("id", cloudTeacher.id)
            .eq("school_id", cloudTeacher.school_id)
            .is("invitation_token", null);
          if (rollbackError) {
            console.error("Teacher activation rollback failed:", String(rollbackError.message || rollbackError).slice(0, 180));
          }
          throw userUpsertError;
        }

        // Do not persist cloud credentials into database.json.
        return res.json({
          success: true,
          message: "Hambalyo! Akoonkaaga Macallinka si buuxda ayaa loo dhaqaajiyey. Hadda waad gali kartaa.",
          email: cleanEmail
        });
      } catch (error: any) {
        console.error("Cloud teacher activation failed:", String(error?.message || error).slice(0, 180));
        return res.status(503).json({
          error: "Dhaqaajinta akoonka laguma kaydin karin kaydka xogta daruurta ah. Fadlan mar kale isku day.",
          code: "DATABASE_UNAVAILABLE"
        });
      }
    }

    // Local fallback is deliberate and used only when cloud mode is disabled.
    const db = loadLocalDB();
    const teacherIndex = (db.teachers || []).findIndex((item: any) => item.invitationToken === token);
    const teacher = teacherIndex > -1 ? db.teachers[teacherIndex] : null;
    if (!teacher) {
      return res.status(400).json({ error: "Casuumaad sax ah lama helin ama horey ayaa loo dhaqaajiyey." });
    }
    if (teacher.invitationExpiresAt && new Date(teacher.invitationExpiresAt) < new Date()) {
      return res.status(400).json({ error: "Casuumaaddani way dhacday. Fadlan weydiiso maamulka in laguu soo diro mid cusub." });
    }

    const cleanEmail = String(teacher.email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return res.status(409).json({ error: "Email-ka macallinka ma saxna." });
    }
    const passwordHash = await hashPassword(password);
    const nowIso = new Date().toISOString();

    db.teachers[teacherIndex].status = "ACTIVE";
    db.teachers[teacherIndex].invitationToken = null;
    db.teachers[teacherIndex].activatedAt = nowIso;
    db.teachers[teacherIndex].invitationStatus = "ACTIVE";

    if (!db.users) db.users = [];
    const userIndex = db.users.findIndex((u: any) => (u.email || "").toLowerCase() === cleanEmail);
    if (userIndex > -1) {
      db.users[userIndex].password_hash = passwordHash;
      db.users[userIndex].verified = true;
      db.users[userIndex].role = "teacher";
      db.users[userIndex].school_id = teacher.schoolId;
      db.users[userIndex].teacher_id = teacher.id;
      delete db.users[userIndex].invitation_token;
    } else {
      db.users.push({
        email: cleanEmail,
        password_hash: passwordHash,
        verified: true,
        role: "teacher",
        school_id: teacher.schoolId,
        teacher_id: teacher.id
      });
    }
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
    if (!authUser || !authUser.schoolId) {
      return res.status(401).json({ error: "Session-ka lama xaqiijin." });
    }
    if (String(authUser.role || "").toLowerCase() === "teacher") {
      return res.status(403).json({ error: "Macallinku awood uma laha dib u diridda casuumaadaha." });
    }

    const { id } = req.params;
    let teacher: any;
    let schoolName = "Dugsiga Pro 2026";
    const newToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const sentAt = new Date().toISOString();

    if (!getUseLocalFallback() && supabase) {
      try {
        const { data, error } = await supabase
          .from("dugsiga_teachers")
          .select("id, school_id, name, email, status")
          .eq("id", id)
          .eq("school_id", authUser.schoolId)
          .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: "Macallinka lama helin." });
        teacher = data;
        if (!teacher.email || !String(teacher.email).includes("@")) {
          return res.status(400).json({ error: "Macallinkani ma laha email sax ah oo casuumaad loogu diro." });
        }

        const { data: updatedTeacher, error: updateError } = await supabase
          .from("dugsiga_teachers")
          .update({
            invitation_token: newToken,
            invitation_expires_at: expiresAt,
            invitation_sent_at: sentAt,
            status: "INVITED"
          })
          .eq("id", id)
          .eq("school_id", authUser.schoolId)
          .select("id")
          .maybeSingle();
        if (updateError) throw updateError;
        if (!updatedTeacher) return res.status(404).json({ error: "Macallinka lama helin ama waa la beddelay." });

        const { data: settingsRow, error: settingsError } = await supabase
          .from("dugsiga_settings")
          .select("value")
          .eq("school_id", authUser.schoolId)
          .eq("key", "main_settings")
          .maybeSingle();
        if (settingsError) throw settingsError;
        schoolName = settingsRow?.value?.schoolName || schoolName;
      } catch (error: any) {
        console.error("Cloud teacher invitation refresh failed:", String(error?.message || error).slice(0, 180));
        return res.status(503).json({
          error: "Casuumaadda laguma cusboonaysiin karin kaydka xogta daruurta ah. Fadlan mar kale isku day.",
          code: "DATABASE_UNAVAILABLE"
        });
      }
    } else {
      const db = loadLocalDB();
      const teacherIndex = (db.teachers || []).findIndex((item: any) =>
        item.id === id && item.schoolId === authUser.schoolId
      );
      if (teacherIndex === -1) return res.status(404).json({ error: "Macallinka lama helin." });
      teacher = db.teachers[teacherIndex];
      if (!teacher.email || !String(teacher.email).includes("@")) {
        return res.status(400).json({ error: "Macallinkani ma laha email sax ah oo casuumaad loogu diro." });
      }
      teacher.invitationToken = newToken;
      teacher.invitationExpiresAt = expiresAt;
      teacher.invitationSentAt = sentAt;
      teacher.status = "INVITED";
      saveLocalDB(db);
      schoolName = db.settings?.schoolName || schoolName;
    }

    const baseUrl = getBaseAppUrl(req);
    const activationLink = `${baseUrl}/activate-teacher?token=${newToken}`;
    let emailResult: { success: boolean };
    try {
      emailResult = await sendTeacherInvitationEmail({
        toEmail: teacher.email,
        teacherName: teacher.name,
        schoolName,
        activationLink,
        expiresInDays: 7
      });
    } catch (error: any) {
      console.warn("Teacher invitation email failed:", String(error?.message || error).slice(0, 160));
      emailResult = { success: false };
    }

    return res.json({
      success: true,
      message: emailResult.success
        ? `Casuumaad cusub waxaa si guul leh loogu diray ${teacher.email}`
        : "Casuumaad cusub waa la sameeyay laakiin email-ka lama diri karin. Link-ga tooska ah hoos kaga koobi garee.",
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
    if (!authUser || !authUser.schoolId) {
      return res.status(401).json({ error: "Session-ka lama xaqiijin." });
    }
    if (String(authUser.role || "").toLowerCase() === "teacher") {
      return res.status(403).json({ error: "Macallinku awood uma laha wax ka beddelka xaaladda macallimiinta." });
    }

    const { id } = req.params;
    const { status } = req.body;
    const newStatus = status === "DEACTIVATED" || status === "INACTIVE" ? "DEACTIVATED" : "ACTIVE";

    if (!getUseLocalFallback() && supabase) {
      try {
        const { data, error } = await supabase
          .from("dugsiga_teachers")
          .update({ status: newStatus })
          .eq("id", id)
          .eq("school_id", authUser.schoolId)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: "Macallinka lama helin." });
        return res.json({ success: true, status: newStatus });
      } catch (error: any) {
        console.error("Cloud teacher status update failed:", String(error?.message || error).slice(0, 180));
        return res.status(503).json({
          error: "Xaaladda macallinka laguma kaydin karin kaydka xogta daruurta ah. Fadlan mar kale isku day.",
          code: "DATABASE_UNAVAILABLE"
        });
      }
    }

    const db = loadLocalDB();
    const idx = (db.teachers || []).findIndex((item: any) =>
      item.id === id && item.schoolId === authUser.schoolId
    );
    if (idx === -1) return res.status(404).json({ error: "Macallinka lama helin." });
    db.teachers[idx].status = newStatus;
    saveLocalDB(db);
    return res.json({ success: true, status: newStatus });
  });

}
