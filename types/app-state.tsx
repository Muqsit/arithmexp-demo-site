import { ArithmExpResponseFailure, ArithmExpResponseSuccess } from "./arithmexp-response";
import { ParserType } from "./parser-type";

export interface AppState{
	expression: string,
	previous_history_active: boolean,
	response: undefined|null|ArithmExpResponseSuccess|ArithmExpResponseFailure,
	variable_values: null|{[key: string]: number|string},
	parser_type: ParserType
};