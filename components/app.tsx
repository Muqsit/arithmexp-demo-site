import { Component, ReactNode } from "react";
import reactStringReplace from "react-string-replace";
import { Accordion, Button, Dropdown, Form, Grid, Icon, Input, Item, Label, Placeholder, Segment, Table } from "semantic-ui-react";
import ExpressionHistory from "./expression-history";
import ExpressionHistoryEntry from "./expression-history-entry";
import GitHubRepoInfo from "../types/github-repo-info";
import { AppProps } from "../types/app-props";
import { AppState } from "../types/app-state";
import { ParserType } from "../types/parser-type";
import Head from "next/head";

export default class App extends Component<AppProps, AppState>{

	private readonly expression_history: ExpressionHistory = new ExpressionHistory(16, []);

	public constructor(props: AppProps){
		super(props);

		let window_hash = "";
		try{
			window_hash = decodeURIComponent(window.location.hash.substring(1));
		}catch(_){
		}

		this.state = {
			expression: window_hash,
			previous_history_active: false,
			response: undefined,
			variable_values: null,
			parser_type: ParserType.DEFAULT
		};
	}

	public componentDidMount() : void{
		this.expression_history.load();
		if(this.state.expression !== ""){
			this.setExpression(this.state.expression);
		}
	}

	private setExpression(expression: string, vars: {[key: string]: number|boolean}|null = null) : void{
		window.location.hash = encodeURIComponent(expression);

		this.setState({response: null});

		const params = new URLSearchParams();
		params.set("expression", expression);
		params.set("parser", this.state.parser_type.toString());
		params.set("variables", JSON.stringify(vars ?? {}));
		fetch(new Request(`/api/evaluate?${params}`, {method: "GET"}))
		.then(response => response.json())
		.then(response => {
			this.setState({
				response: response,
				variable_values: response.success && Object.entries(response.result.variables).length > 0 ? response.result.variables : null
			});
			this.expression_history.push(new ExpressionHistoryEntry(
				expression,
				response.success
			));
			window.scrollTo(0, 0);
		}).catch(reason => {
			this.setState({
				response: {
					success: false,
					result: {
						type: "InternalServerError",
						message: [`Could not contact server for evaluation: ${reason.message}`],
						trace: []
					}
				},
				variable_values: null
			});
			window.scrollTo(0, 0);
		});
	}

	private toPrintableExpression(expression: string) : React.ReactNodeArray{
		return reactStringReplace(expression, /(<open>|<\/open>)/, (match: any) => <span className="dimgray">{match === "<open>" ? "(" : ")"}</span>);
	}

	private renderGitHubRepositoryInfo() : ReactNode{
		const data: GitHubRepoInfo = this.props.arithmexp_info;
		return <Segment textAlign="left">
			<Item.Group divided>
				<Item>
					<Item.Content>
						<Item.Header as="a" href={data.html_url}>{data.full_name.toLowerCase()}</Item.Header>
						<Item.Meta>{data.description}</Item.Meta>
						<Item.Extra>
							<Label as="a" href={`${data.html_url}/stargazers`}>
								<Icon name="star outline"/>
								{data.stargazers_count}
							</Label>
							<Label as="a" href={`${data.html_url}/network/members`}>
								<Icon name="fork"/>
								{data.forks_count}
							</Label>
							<Label as="a" href={`${data.html_url}/issues`}>
								<Icon name="dot circle outline"/>
								{data.open_issues_count}
							</Label>
							<Label as="a" href={`${data.html_url}/blob/master/LICENSE`}>
								<Icon name="law"/>
								{data.license.spdx_id}
							</Label>
						</Item.Extra>
					</Item.Content>
				</Item>
	  		</Item.Group>
		</Segment>;
	}

	private renderResponseState() : null|ReactNode{
		if(this.state.response === undefined){
			return null;
		}

		if(this.state.response === null){
			return <pre>
				<Segment className="console" color="black" inverted>
					<Placeholder fluid inverted>
						<Placeholder.Line/>
						<Placeholder.Line/>
						<Placeholder.Line/>
						<Placeholder.Line/>
						<Placeholder.Line/>
						<Placeholder.Line/>
					</Placeholder>
				</Segment>
			</pre>;
		}

		if(!this.state.response.success){
			return <pre>
				<Segment className="console" color="black" inverted>
					<div>
						<span className="orange">{this.state.response.result.type}</span>
						<span className="gray">: </span>
						<span className="red">{this.state.response.result.message[0]}</span>
					</div>
					{this.state.response.result.message.slice(1).map((message, index) => <span key={index} className="lightgray">{message}<br/></span>)}
					{this.state.response.result.trace.map((trace, index) => <span key={index} className="gray">{trace}<br/></span>)}
				</Segment>
			</pre>;
		}

		const postfix_analytics: {[key: string]: number} = {};
		if(this.state.response.result.postfix.type === "raw"){
			for(const {type} of this.state.response.result.postfix.value){
				postfix_analytics[type] ??= 0;
				postfix_analytics[type]++;
			}
		}

		return <>
			<pre>
				<Segment className="console" color="black" inverted>
					<div>
						<span className="aqua">Original</span>
						<span className="gray">: </span>
						<span className="orange">{this.state.response.result.unoptimized.type}</span>
						<span className="gray">(</span>
						<span className="white">{this.toPrintableExpression(this.state.response.result.unoptimized.expression)}</span>
						<span className="gray">)</span>
					</div>
					{this.state.parser_type === ParserType.DEFAULT ? <div>
						<span className="aqua">Optimized</span>
						<span className="gray">: </span>
						<span className="orange">{this.state.response.result.default.type}</span>
						<span className="gray">(</span>
						<span className="white">{this.toPrintableExpression(this.state.response.result.default.expression)}</span>
						<span className="gray">)</span>
					</div> : null}
					<div>
						<span className="aqua">Result</span>
						<span className="gray">: </span>
						<span className="orange">{this.state.response.result.result.type}</span>
						<span className="gray">(</span>
						<span className="white">{this.state.response.result.result.value}</span>
						<span className="gray">)</span>
					</div>
					{this.state.variable_values !== null ? <div>
						<span className="gray"> | </span>
						<span className="orange">where:</span>
						<form onSubmit={e => {
							if(this.state.variable_values === null || !(e.target instanceof HTMLFormElement)){
								return;
							}

							e.preventDefault();

							const data: FormData = new FormData(e.target);
							const vars: {[key: string]: number|boolean} = {};
							for(const [key, default_value] of Object.entries(this.state.variable_values)){
								const val_raw = data.get(key)?.valueOf() ?? 0;
								let val: number|boolean;
								if(val_raw === "false"){
									val = false;
								}else if(val_raw === "true"){
									val = true;
								}else{
									val = Number(data.get(key)?.valueOf() ?? 0);
									val = isNaN(val) ? Number(default_value) : val;
								}
								vars[key] = val;
							}
							this.setExpression(this.state.expression, vars);
						}}>
							<input type="submit" hidden />
							{Object.entries(this.state.variable_values).map((entry, index) => <div key={index}>
								<span className="gray"> |     </span>
								<span className="orange">{entry[0]}</span>
								<span className="gray"> = </span>
								<input
									autoComplete="off"
									autoCapitalize="off"
									name={entry[0]}
									className="variable-input-field"
									value={entry[1]}
									onChange={e => this.setState({variable_values: {...this.state.variable_values, [entry[0]]: e.target.value}})}
								/>
							</div>)}
						</form>
					</div> : null}
				</Segment>
				<Segment className="console" color="black" inverted>
					<span className="aqua">{this.state.parser_type === ParserType.DEFAULT ? "Optimized " : ""}Postfix Expression</span>
					{this.state.response.result.postfix.type === "raw" ? <span>
						<span className="gray">: </span>
						{this.state.response.result.postfix.value.map((entry, index) => <span key={index} className={entry.type === "Variable" ? "white" : (entry.type === "Numeric Literal" ? "lightblue" : "orange")}>{entry.value} </span>)}
						<div>
							<span className="gray"> | </span>
							<span className="orange">contains:</span>
							{Object.entries(postfix_analytics).map((entry, index) => <div key={index}>
								<span className="gray"> |     </span>
								<span className="lightblue">{entry[1]} </span>
								<span className="orange">{entry[0] + (entry[1] === 1 ? "" : "s")}</span>
							</div>)}
						</div>
					</span> : <div>
						<span className="gray"> | </span>
						<span className="orange">is a constant: </span>
						<span className="lightblue">{this.state.response.result.postfix.value}</span>
					</div>}
				</Segment>
			</pre>
			<Segment
				textAlign="right"
				size="small"
				style={{padding: "0px"}}
				vertical
			>arithmexp v{this.state.response.version}</Segment>
		</>;
	}

	private renderExpressionHistory() : null|ReactNode{
		const entries = this.expression_history.getEntries();
		return <Accordion fluid styled>
			<Accordion.Title
				active={this.state.previous_history_active}
				onClick={_ => this.setState({previous_history_active: !this.state.previous_history_active})}
			>
				<Icon name="dropdown"/>
				Previous Expressions
			</Accordion.Title>
			<Accordion.Content active={this.state.previous_history_active}>
				<Table celled selectable={entries.length > 0} textAlign="center">
					<Table.Body>
						{entries.length > 0 ? [...entries].reverse().map((entry, index) => <Table.Row
							className="prev_history"
							key={index}
							positive={entry.succeeded}
							negative={!entry.succeeded}
							selectable="true"
							onClick={(_: any) => this.setState({expression: entry.expression}, () => this.setExpression(entry.expression))}
						>
							<Table.Cell>{entry.expression}</Table.Cell>
						</Table.Row>) : <Table.Row><Table.Cell>Expression history is empty.</Table.Cell></Table.Row>}
					</Table.Body>
				</Table>
			</Accordion.Content>
		</Accordion>;
	}

	public render() : ReactNode{
		return <>
			<Head>
				<meta property="og:description" content={this.props.arithmexp_info.description} />
				<meta property="og:image" content={this.props.arithmexp_info.owner.avatar_url} />
			</Head>
			<Grid centered container>
				<Grid.Column textAlign="center" width={15}/>
				<Grid.Column textAlign="center" width={15}>
					{this.renderGitHubRepositoryInfo()}
					<Segment textAlign="left">
						<Form onSubmit={_ => this.setExpression(this.state.expression)} autoComplete="off">
							<label>Expression</label>
							<Input
								action={true}
								value={this.state.expression}
								placeholder="x + tan(y) / z"
								onChange={e => this.setState({expression: e.target.value, variable_values: null})}
								fluid
							>
								<input autoCapitalize="off" autoComplete="off"/>
								<Button icon="calculator" color="blue"/>
							</Input>
							<br/>
							<label>Parser</label>
							<Dropdown
								options={[
									{key: 1, text: "Default Parser", value: ParserType.DEFAULT},
									{key: 2, text: "Unoptimized Parser", value: ParserType.UNOPTIMIZED}
								]}
								selection
								fluid
								placeholder="Select a parser"
								value={this.state.parser_type}
								onChange={(_, data) => {
									if(typeof data.value !== null){
										this.setState({parser_type: data.value as ParserType}, () => this.setExpression(this.state.expression));
									}
								}}
							/>
						</Form>
						{this.renderResponseState()}
					</Segment>
					{this.renderExpressionHistory()}
				</Grid.Column>
			</Grid>
		</>;
	}
};