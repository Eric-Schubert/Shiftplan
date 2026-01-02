export interface Staff {
  staff_id: number;
  name: string;
  active: number;
  is_parttime: number;
}

export interface StaffCreateDTO {
  name: string;
  active?: number;
  is_parttime?: number;
}

export interface StaffUpdateDTO {
  name?: string;
  active?: number;
  is_parttime?: number;
}
