export interface ArithmExpResponseFailure{
	success: false,
	result: {
		type: string,
		message: string[],
		trace: string[]
	}
};

export interface ArithmExpResponseSuccess{
	success: true,
	version: string,
	result: {
		default: {
			type: string,
			expression: string
		},
		unoptimized: {
			type: string,
			expression: string
		},
		result: {
			type: "int"|"float",
			value: string
		},
		variables: {[key: string]: number},
		postfix: {
			type: "constant",
			value: number
		}|{
			type: "raw",
			value: {
				type: string,
				value: string
			}[]
		}
	}
};