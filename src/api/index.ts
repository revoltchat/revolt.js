export interface Request { }

export interface Response {
	success: boolean,
	error?: string,
}

export * from './account';
export * from './users';
export * from './channels';
