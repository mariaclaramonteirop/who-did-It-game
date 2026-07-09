<?php

declare(strict_types=1);

namespace App\Routes;

use App\Config\Database;
use App\Controllers\QuestionController;
use App\Controllers\RoomController;
use App\Controllers\RoundController;
use App\Services\GameService;
use Slim\App;

final class Routes
{
    public static function register(App $app): void
    {
        $service = fn () => new GameService(Database::connection());

        $app->get('/', function ($request, $response) {
            $response->getBody()->write(json_encode(['status' => 'ok', 'app' => 'Jogo dos Culpados API']));
            return $response->withHeader('Content-Type', 'application/json');
        });

        $app->post('/rooms', fn ($request, $response, $args) => (new RoomController($service()))->create($request, $response));
        $app->get('/rooms/{code}', fn ($request, $response, $args) => (new RoomController($service()))->show($request, $response, $args));
        $app->post('/rooms/{code}/players', fn ($request, $response, $args) => (new RoomController($service()))->addPlayer($request, $response, $args));
        $app->post('/rooms/{code}/start', fn ($request, $response, $args) => (new RoomController($service()))->start($request, $response, $args));
        $app->post('/rooms/{code}/rounds', fn ($request, $response, $args) => (new RoomController($service()))->createRound($request, $response, $args));
        $app->get('/rooms/{code}/ranking', fn ($request, $response, $args) => (new RoomController($service()))->ranking($request, $response, $args));

        $app->get('/rounds/{id}', fn ($request, $response, $args) => (new RoundController($service()))->show($request, $response, $args));
        $app->post('/rounds/{id}/votes', fn ($request, $response, $args) => (new RoundController($service()))->vote($request, $response, $args));
        $app->get('/rounds/{id}/result', fn ($request, $response, $args) => (new RoundController($service()))->result($request, $response, $args));

        $app->get('/questions', fn ($request, $response) => (new QuestionController($service()))->list($request, $response));
        $app->post('/questions', fn ($request, $response) => (new QuestionController($service()))->create($request, $response));
    }
}
