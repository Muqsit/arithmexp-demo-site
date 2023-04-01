export default class ExpressionHistoryEntry{

	public constructor(
		public readonly expression: string,
		public readonly succeeded: boolean
	){}

	public equals(entry: ExpressionHistoryEntry) : boolean{
		return entry.expression === this.expression && entry.succeeded === this.succeeded;
	}
};