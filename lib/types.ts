export type Role = "admin" | "manager" | "employee";

export type ShiftCategory = "VISIT" | "CALL" | "LEAD" | "ADMIN" | "ABS" | "WFH";

export type Team = {
  id: string;
  name: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  team_id: string | null;
  calendar_feed_token: string;
  created_at: string;
};

export type PlanningCycle = {
  id: string;
  year: number;
  cycle_number: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
};

export type Week = {
  id: string;
  cycle_id: string;
  iso_week_number: number;
  start_date: string;
  end_date: string;
};

export type Shift = {
  id: string;
  user_id: string;
  week_id: string;
  start_at: string;
  end_at: string;
  category: ShiftCategory;
  location: string | null;
  notes: string | null;
  created_at: string;
};

export type ShiftWithProfile = Shift & {
  profiles?: Pick<Profile, "id" | "full_name" | "team_id"> | null;
};
