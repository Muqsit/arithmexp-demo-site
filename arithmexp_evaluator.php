<?php

declare(strict_types=1);

require "vendor/autoload.php";

use muqsit\arithmexp\expression\ConstantExpression;
use muqsit\arithmexp\expression\Expression;
use muqsit\arithmexp\expression\token\ExpressionToken;
use muqsit\arithmexp\expression\token\FunctionCallExpressionToken;
use muqsit\arithmexp\expression\token\NumericLiteralExpressionToken;
use muqsit\arithmexp\expression\token\OpcodeExpressionToken;
use muqsit\arithmexp\expression\token\VariableExpressionToken;
use muqsit\arithmexp\function\FunctionFlags;
use muqsit\arithmexp\Parser;
use muqsit\arithmexp\ParseException;
use muqsit\arithmexp\token\BinaryOperatorToken;
use muqsit\arithmexp\token\OpcodeToken;
use muqsit\arithmexp\token\UnaryOperatorToken;
use muqsit\arithmexp\Util;

header("Content-Type: application/json");

final class _Expr implements Stringable{

	public function __construct(
		public array $arguments,
		public ExpressionToken $token
	){}

	public function __toString() : string{
		return match($this->token::class){
			FunctionCallExpressionToken::class => "{$this->token}(" . implode(", ", $this->arguments) . ")",
			OpcodeExpressionToken::class => match($this->token->code){
				OpcodeToken::OP_UNARY_PVE, OpcodeToken::OP_UNARY_NVE => "{$this->token}{$this->arguments[0]}",
				default => "{$this->arguments[0]} {$this->token} {$this->arguments[1]}"
			},
			default => (string) $this->token
		};
	}
}

function send_error(Throwable $t) : void{
	$trace = $t->getTraceAsString();
	$trace = str_replace(implode(DIRECTORY_SEPARATOR, [dirname(__FILE__), "vendor", "muqsit", "arithmexp", "src", ""]), "./", $trace);
	$trace = str_replace(dirname(__FILE__) . DIRECTORY_SEPARATOR, "./", $trace);
	$trace_list = explode(PHP_EOL, $trace);
	echo json_encode([
		"success" => false,
		"result" => [
			"type" => (new ReflectionClass($t))->getShortName(),
			"message" => explode(PHP_EOL, $t->getMessage()),
			"trace" => $trace_list
		]
	]);
}

function postfix_to_infix(Parser $parser, Expression $expression) : string{
	if($expression instanceof ConstantExpression){
		return (string) $expression->evaluate();
	}

	$stack = [];
	foreach($expression->getPostfixExpressionTokens() as $token){
		$token_fcall_like = Util::asFunctionCallExpressionToken($parser, $token) ?? $token;
		if($token_fcall_like instanceof FunctionCallExpressionToken){
			$arguments = array_splice($stack, -$token_fcall_like->argument_count);
			if(!($token instanceof FunctionCallExpressionToken)){
				foreach($arguments as $index => $arg){
					if(!($arg instanceof _Expr)){
						continue;
					}
					if($arg->token instanceof FunctionCallExpressionToken){
						continue;
					}
					if($arg->token->equals($token) && ($token_fcall_like->flags & FunctionFlags::COMMUTATIVE) > 0){
						continue;
					}
					$arguments[$index] = "<open>{$arg}</open>";
				}
			}
			$stack[] = new _Expr($arguments, $token);
		}else{
			$stack[] = $token;
		}
	}

	return (string) $stack[0];
}

function get_version() : string{
	apcu_delete("MUQSIT_ARITHMEXP_VERSION");
	$MUQSIT_ARITHMEXP_VERSION = apcu_fetch("MUQSIT_ARITHMEXP_VERSION");
	$MUQSIT_ARITHMEXP_VERSION = false;
	if($MUQSIT_ARITHMEXP_VERSION === false){
		$data = json_decode(file_get_contents("composer.lock"), true);
		foreach($data["packages"] as ["name" => $name, "version" => $version]){
			if($name === "muqsit/arithmexp"){
				$MUQSIT_ARITHMEXP_VERSION = $version;
				apcu_store("MUQSIT_ARITHMEXP_VERSION", $MUQSIT_ARITHMEXP_VERSION, 3600);
				break;
			}
		}
	}
	return $MUQSIT_ARITHMEXP_VERSION;
}

$expression = $_GET["expression"];
$parser_type = $_GET["parser"] ?? "default";
$variables = isset($_GET["variables"]) ? json_decode($_GET["variables"], true) : [];

$parser = match($parser_type){
	"unoptimized" => Parser::createUnoptimized(),
	default => Parser::createDefault()
};

$uo_parser = Parser::createUnoptimized();

try{
	$default = $parser->parse($expression);
}catch(ParseException $e){
	send_error($e);
	return;
}

$unoptimized = $uo_parser->parse($expression);

$vars = $variables;
foreach($default->findVariables() as $variable){
	$vars[$variable] ??= mt_rand(0, 100);
}

try{
	$result = $default->evaluate($vars);
}catch(Throwable $t){
	send_error($t);
	return;
}

$result_string = match($result){
	true => "true", // because (string) true is displayed as "1"
	false => "false", // because (string) false is displayed as ""
	default => (string) $result // because $result can be INF/NAN which are not supported in JSON
};

echo json_encode([
	"success" => true,
	"version" => get_version(),
	"result" => [
		"default" => [
			"type" => (new ReflectionClass($default))->getShortName(),
			"expression" => postfix_to_infix($parser, $default)
		],
		"unoptimized" => [
			"type" => (new ReflectionClass($unoptimized))->getShortName(),
			"expression" => postfix_to_infix($uo_parser, $unoptimized)
		],
		"result" => [
			"type" => match(gettype($result)){
				"integer" => "int",
				"double" => "float",
				"boolean" => "boolean"
			},
			"value" => $result_string
		],
		"variables" => (object) $vars,
		"postfix" => $default instanceof ConstantExpression ? [
			"type" => "constant",
			"value" => $result_string
		] : [
			"type" => "raw",
			"value" => array_map(static function(ExpressionToken $token) : array{
				return [
					"type" => match($token::class){
						FunctionCallExpressionToken::class => "Function Call",
						NumericLiteralExpressionToken::class => "Numeric Literal",
						OpcodeExpressionToken::class => "Opcode",
						VariableExpressionToken::class => "Variable"
					},
					"value" => (string) $token
				];
			}, $default->getPostfixExpressionTokens())
		]
	]
], JSON_THROW_ON_ERROR);
