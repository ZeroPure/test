export interface UserAccount {
    id: string;
    username: string;
    password?: string;
    email: string;
    name: string;
    role: 'admin' | 'teacher' | 'student';
    group_id?: string;
    group_name?: string;
    createdAt: Date;
    lastLogin: Date | null;
}

export interface Group {
    id: string;
    name: string;
    created_at: string;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    gitRepo: string;
    groupId: string;
    createdAt: string;
}

export interface Resource {
    id: string;
    title: string;
    description?: string;
    url: string;
    type: 'file' | 'link';
    fileData?: string;
    uploadedAt: Date;
    downloadCount?: number;
    groupId?: string;
    group_name?: string;
}
