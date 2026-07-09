<?php

declare(strict_types=1);

namespace App\Routes;

use App\Config\Database;
use App\Controllers\AdminController;
use App\Controllers\CategoryController;
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
            $response->getBody()->write(json_encode(['status' => 'ok', 'app' => 'Quem fez isso? Who Did It? API']));
            return $response->withHeader('Content-Type', 'application/json');
        });

        $app->post('/rooms', fn ($request, $response, $args) => (new RoomController($service()))->create($request, $response));
        $app->get('/rooms/{code}', fn ($request, $response, $args) => (new RoomController($service()))->show($request, $response, $args));
        $app->post('/rooms/{code}/players', fn ($request, $response, $args) => (new RoomController($service()))->addPlayer($request, $response, $args));
        $app->post('/rooms/{code}/start', fn ($request, $response, $args) => (new RoomController($service()))->start($request, $response, $args));
        $app->post('/rooms/{code}/rounds', fn ($request, $response, $args) => (new RoomController($service()))->createRound($request, $response, $args));
        $app->get('/rooms/{code}/ranking', fn ($request, $response, $args) => (new RoomController($service()))->ranking($request, $response, $args));

        $app->post('/admin/login', fn ($request, $response) => (new AdminController($service()))->login($request, $response));
        $app->get('/admin/dashboard', fn ($request, $response) => (new AdminController($service()))->dashboard($request, $response));
        $app->get('/admin/rooms', fn ($request, $response) => (new AdminController($service()))->rooms($request, $response));
        $app->patch('/admin/rooms/{id}', fn ($request, $response, $args) => (new AdminController($service()))->updateRoom($request, $response, $args));
        $app->delete('/admin/rooms/{id}', fn ($request, $response, $args) => (new AdminController($service()))->deleteRoom($request, $response, $args));
        $app->get('/admin/players', fn ($request, $response) => (new AdminController($service()))->players($request, $response));
        $app->patch('/admin/players/{id}', fn ($request, $response, $args) => (new AdminController($service()))->updatePlayer($request, $response, $args));
        $app->delete('/admin/players/{id}', fn ($request, $response, $args) => (new AdminController($service()))->deletePlayer($request, $response, $args));
        $app->get('/admin/users', fn ($request, $response) => (new AdminController($service()))->users($request, $response));
        $app->post('/admin/users', fn ($request, $response) => (new AdminController($service()))->createUser($request, $response));
        $app->patch('/admin/users/{id}', fn ($request, $response, $args) => (new AdminController($service()))->updateUser($request, $response, $args));

        $app->get('/rounds/{id}', fn ($request, $response, $args) => (new RoundController($service()))->show($request, $response, $args));
        $app->post('/rounds/{id}/votes', fn ($request, $response, $args) => (new RoundController($service()))->vote($request, $response, $args));
        $app->get('/rounds/{id}/result', fn ($request, $response, $args) => (new RoundController($service()))->result($request, $response, $args));

        $app->get('/questions', fn ($request, $response) => (new QuestionController($service()))->list($request, $response));
        $app->post('/questions', fn ($request, $response) => (new QuestionController($service()))->create($request, $response));
        $app->post('/questions/import', fn ($request, $response) => (new QuestionController($service()))->import($request, $response));
        $app->patch('/questions/{id}', fn ($request, $response, $args) => (new QuestionController($service()))->update($request, $response, $args));
        $app->delete('/questions/{id}', fn ($request, $response, $args) => (new QuestionController($service()))->deactivate($request, $response, $args));

        $app->get('/categories', fn ($request, $response) => (new CategoryController($service()))->list($request, $response));
        $app->post('/categories', fn ($request, $response) => (new CategoryController($service()))->create($request, $response));
        $app->patch('/categories/{id}', fn ($request, $response, $args) => (new CategoryController($service()))->update($request, $response, $args));
        $app->delete('/categories/{id}', fn ($request, $response, $args) => (new CategoryController($service()))->deactivate($request, $response, $args));
    }
}
