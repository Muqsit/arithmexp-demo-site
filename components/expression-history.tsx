import ExpressionHistoryEntry from "./expression-history-entry";

export default class ExpressionHistory{

	private static readonly LOCAL_STORAGE_KEY = "expression_history";

	public constructor(
		private readonly size: number,
		private entries: ExpressionHistoryEntry[]
	){}

	public load() : void{
		const stored = window.localStorage.getItem(ExpressionHistory.LOCAL_STORAGE_KEY);
		this.entries = stored !== null ? JSON.parse(stored).map((entry: {expression: string, succeeded: boolean}) => new ExpressionHistoryEntry(
			entry.expression,
			entry.succeeded
		)) : [];
		this.updateEntries();
	}

	private updateEntries() : void{
		if(this.entries.length > this.size){
			this.entries.splice(0, this.entries.length - this.size);
		}
		window.localStorage.setItem(ExpressionHistory.LOCAL_STORAGE_KEY, JSON.stringify(this.entries));
	}

	public push(expression: ExpressionHistoryEntry) : void{
		const existing_index = this.entries.findIndex(entry => entry.expression === expression.expression);
		if(existing_index !== -1){
			if(existing_index === this.entries.length - 1 && this.entries[existing_index].equals(expression)){
				return;
			}
			this.entries.splice(existing_index, 1);
		}

		this.entries.push(expression);
		this.updateEntries();
	}

	public getEntries() : ExpressionHistoryEntry[]{
		return this.entries;
	}
};