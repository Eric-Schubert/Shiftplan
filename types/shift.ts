export interface Shift {
  shift_id: number;
  name: string;
  active: number;
  start_time: string;
  end_time: string;
  color: string;
  min_staff: number;
  sort_order: number;
}

export interface ShiftCreateDTO {
  name: string;
  start_time: string;
  end_time: string;
  color?: string;
  min_staff?: number;
  sort_order?: number;
}

export interface ShiftUpdateDTO {
  name?: string;
  active?: number;
  start_time?: string;
  end_time?: string;
  color?: string;
  min_staff?: number;
  sort_order?: number;
}
