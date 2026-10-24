export type WorkerRole = 'worker' | 'admin';

export type WorkerAccount = {
	id: string;
	name: string;
	email: string;
	roles: string[];
	blocked: boolean;
	editable: boolean;
	self: boolean;
};

export type WorkerPage = { workers: WorkerAccount[]; page: number; hasMore: boolean };
