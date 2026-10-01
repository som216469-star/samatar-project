import React from 'react';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Student } from '../../../types';
import { StudentSubSection } from '../../../app/navigationConfig';

export interface StudentDashboardStats {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  newlyRegistered: number;
  needsAttention: number;
  male: number;
  female: number;
  malePercent: number;
  femalePercent: number;
  byClass: Array<{ className: string; count: number }>;
  recentlyAdded: Student[];
  recentlyUpdated: Student[];
}

interface StudentsStatsOverviewProps {
  stats: StudentDashboardStats;
  onNavigateSubSection?: (sub: StudentSubSection) => void;
  setSelectedStatusFilter: (val: string) => void;
  selectedRegDateFilter: string;
  setSelectedRegDateFilter: (val: string) => void;
  selectedFeeFilter: string;
  setSelectedFeeFilter: (val: string) => void;
  selectedClassFilter: string;
  setSelectedClassFilter: (val: string) => void;
  showDashboardDetails: boolean;
  setShowDashboardDetails: (val: boolean) => void;
  onOpenProfile: (student: Student) => void;
}

export const StudentsStatsOverview: React.FC<StudentsStatsOverviewProps> = ({
  stats,
  onNavigateSubSection,
  setSelectedStatusFilter,
  selectedRegDateFilter,
  setSelectedRegDateFilter,
  selectedFeeFilter,
  setSelectedFeeFilter,
  selectedClassFilter,
  setSelectedClassFilter,
  showDashboardDetails,
  setShowDashboardDetails,
  onOpenProfile
}) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total */}
        <div
          onClick={() =>
            onNavigateSubSection ? onNavigateSubSection('all') : setSelectedStatusFilter('all')
          }
          className="bg-[#0f0f0f] border border-[#ffffff10] hover:border-[#7c3aed]/40 rounded-sm p-4 space-y-1 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
              Wadar Guud
            </span>
            <Users className="w-4 h-4 text-[#c4b5fd]" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{stats.total}</p>
          <p className="text-[9px] text-[#737373] uppercase tracking-wider">Total Enrolled</p>
        </div>

        {/* Card 2: Active */}
        <div
          onClick={() =>
            onNavigateSubSection
              ? onNavigateSubSection('active')
              : setSelectedStatusFilter('active')
          }
          className="bg-[#0f0f0f] border border-[#ffffff10] hover:border-emerald-500/40 rounded-sm p-4 space-y-1 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
              Firfircoon
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400">{stats.active}</p>
          <p className="text-[9px] text-[#737373] uppercase tracking-wider">Active Students</p>
        </div>

        {/* Card 3: Inactive */}
        <div
          onClick={() =>
            onNavigateSubSection
              ? onNavigateSubSection('inactive')
              : setSelectedStatusFilter('inactive')
          }
          className="bg-[#0f0f0f] border border-[#ffffff10] hover:border-amber-500/40 rounded-sm p-4 space-y-1 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">
              Joojiyey
            </span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400">{stats.inactive}</p>
          <p className="text-[9px] text-[#737373] uppercase tracking-wider">Inactive Roster</p>
        </div>

        {/* Card 4: Newly Registered This Month */}
        <div
          onClick={() =>
            setSelectedRegDateFilter(
              selectedRegDateFilter === 'this_month' ? 'all' : 'this_month'
            )
          }
          className={`bg-[#0f0f0f] border rounded-sm p-4 space-y-1 cursor-pointer transition-colors ${
            selectedRegDateFilter === 'this_month'
              ? 'border-[#7c3aed]'
              : 'border-[#ffffff10] hover:border-[#7c3aed]/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#c4b5fd] font-bold">
              Cusub Bishan
            </span>
            <Calendar className="w-4 h-4 text-[#c4b5fd]" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{stats.newlyRegistered}</p>
          <p className="text-[9px] text-[#737373] uppercase tracking-wider">Newly Registered</p>
        </div>

        {/* Card 5: Requiring Attention */}
        <div
          onClick={() =>
            setSelectedFeeFilter(selectedFeeFilter === 'attention' ? 'all' : 'attention')
          }
          className={`bg-[#0f0f0f] border rounded-sm p-4 space-y-1 cursor-pointer transition-colors ${
            selectedFeeFilter === 'attention'
              ? 'border-rose-500'
              : 'border-[#ffffff10] hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-rose-400 font-bold">
              U Baahan Fiiro
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-400">{stats.needsAttention}</p>
          <p className="text-[9px] text-[#737373] uppercase tracking-wider">Needs Attention</p>
        </div>

        {/* Card 6: Male / Female Ratio */}
        <div className="bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#888888] font-bold">
              Lab & Dhedig
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className="text-[#60a5fa] font-bold">M:{stats.male}</span>
              <span className="text-[#737373]">·</span>
              <span className="text-[#f472b6] font-bold">F:{stats.female}</span>
            </div>
          </div>
          <div className="h-2 w-full bg-[#1e1e1e] rounded-full overflow-hidden flex">
            <div
              style={{ width: `${stats.malePercent}%` }}
              className="bg-[#3b82f6] h-full transition-all duration-500"
              title={`Male: ${stats.malePercent}%`}
            />
            <div
              style={{ width: `${stats.femalePercent}%` }}
              className="bg-[#ec4899] h-full transition-all duration-500"
              title={`Female: ${stats.femalePercent}%`}
            />
          </div>
          <div className="flex justify-between text-[9px] text-[#737373] font-mono">
            <span>{stats.malePercent}% M</span>
            <button
              type="button"
              onClick={() => setShowDashboardDetails(!showDashboardDetails)}
              className="text-[#c4b5fd] hover:underline font-sans font-semibold"
            >
              {showDashboardDetails ? 'Qari Faahfaahinta' : 'Faahfaahin +'}
            </button>
          </div>
        </div>
      </div>

      {/* Progressive Analytics Drawer: Students by Class, Recently Added & Recently Updated */}
      {showDashboardDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-[#0f0f0f] border border-[#ffffff10] rounded-sm p-4 animate-fade-in">
          {/* Students by Class */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#a3a3a3] font-bold border-b border-[#ffffff08] pb-1.5">
              Ardayda Fasallada (Students by Class)
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {stats.byClass.length === 0 ? (
                <p className="text-xs text-[#555555]">Ma jiraan fasallo</p>
              ) : (
                stats.byClass.map((item) => (
                  <div
                    key={item.className}
                    onClick={() =>
                      setSelectedClassFilter(
                        selectedClassFilter === item.className ? 'all' : item.className
                      )
                    }
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-sm hover:bg-[#ffffff05] cursor-pointer"
                  >
                    <span className="text-[#e5e5e5] font-medium">{item.className}</span>
                    <span className="font-mono text-[#c4b5fd] font-bold">
                      {item.count} arday
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recently Added Students */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#a3a3a3] font-bold border-b border-[#ffffff08] pb-1.5">
              Dhawaan La Diiwaangeliyey (Recently Added)
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {stats.recentlyAdded.map((st) => (
                <div
                  key={st.id}
                  onClick={() => onOpenProfile(st)}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded-sm hover:bg-[#ffffff05] cursor-pointer"
                >
                  <span className="text-[#e5e5e5] truncate max-w-[160px]">{st.fullName}</span>
                  <span className="font-mono text-[10px] text-[#737373]">
                    {st.class} · {st.createdAt || '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Updated Students */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-[#a3a3a3] font-bold border-b border-[#ffffff08] pb-1.5">
              Dhawaan La Cusbooneysiiyey (Recently Updated)
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {stats.recentlyUpdated.map((st) => (
                <div
                  key={st.id}
                  onClick={() => onOpenProfile(st)}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded-sm hover:bg-[#ffffff05] cursor-pointer"
                >
                  <span className="text-[#e5e5e5] truncate max-w-[160px]">{st.fullName}</span>
                  <span className="font-mono text-[10px] text-[#737373]">
                    {st.updatedAt || st.createdAt || '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
