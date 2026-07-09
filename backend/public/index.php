<?php

declare(strict_types=1);

use App\Exceptions\HttpException;
use App\Routes\Routes;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$dotenvPath = dirname(__DIR__);
if (class_exists(Dotenv\Dotenv::class) && file_exists($dotenvPath . '/.env')) {
    Dotenv\Dotenv::createImmutable($dotenvPath)->safeLoad();
}

$app = AppFactory::create();
$app->addBodyParsingMiddleware();

$app->add(function (Request $request, $handler): Response {
    $response = $handler->handle($request);
    return $response
        ->withHeader('Access-Control-Allow-Origin', '*')
        ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
});

$app->options('/{routes:.+}', fn (Request $request, Response $response) => $response
    ->withHeader('Access-Control-Allow-Origin', '*')
    ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS'));

Routes::register($app);

$app->addErrorMiddleware(true, true, true)->setDefaultErrorHandler(
    function (Request $request, Throwable $exception, bool $displayErrorDetails) use ($app): Response {
        $status = $exception instanceof HttpException ? $exception->getStatusCode() : 500;
        $message = $exception instanceof HttpException ? $exception->getMessage() : 'Erro interno do servidor';
        $response = $app->getResponseFactory()->createResponse($status);
        $response->getBody()->write(json_encode([
            'error' => true,
            'message' => $message,
        ], JSON_UNESCAPED_UNICODE));
        return $response->withHeader('Content-Type', 'application/json');
    }
);

$app->run();
