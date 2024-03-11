import fs from 'fs';

export const setChmod = (path: string, mode: number): Promise<true> =>
	new Promise((resolve, reject) => {
		fs.chmod(path, mode, err => {
			if (err) reject(err);
			resolve(true);
		});
	});
