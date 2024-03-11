export class UnauthorisedError extends Error {
	constructor(public message: string) {
		super(message);
	}
}
