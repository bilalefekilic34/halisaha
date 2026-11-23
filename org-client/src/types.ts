export interface AuthUser {
    token: string;
    userId: number;
    fullName: string;
    email: string;
    role: 'Admin' | 'Customer';
}

export interface Pitch {
    id: number;
    name: string;
    surfaceType: string;
    hourlyPrice: number;
    isActive: boolean;
}

export interface ScheduleSlot {
    id: number;
    startTime: string;
    endTime: string;
}

export interface Reservation {
    id: number;
    pitchId: number;
    pitchName: string;
    userId: number;
    userFullName: string;
    userPhone: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
    status: 'Confirmed' | 'Cancelled' | 'Pending';
}