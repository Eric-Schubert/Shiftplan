export interface Staff {
  staff_id: number;
  name: string;
  active: number;
  is_parttime: number;
  /** Personal sign-in name for the PIN login, e.g. "MM". */
  short_code: string | null;
}

export interface StaffCreateDTO {
  name: string;
  active?: number;
  is_parttime?: number;
  short_code?: string;
}

export interface StaffUpdateDTO {
  name?: string;
  active?: number;
  is_parttime?: number;
  short_code?: string;
}
