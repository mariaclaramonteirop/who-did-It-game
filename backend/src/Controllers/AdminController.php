<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\GameService;
use App\Utils\JsonResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminController
{
    public function __construct(private readonly GameService $service)
    {
    }

    public function login(Request $request, Response $response): Response
    {
        return JsonResponse::send($response, $this->service->adminLogin((array) $request->getParsedBody()));
    }

    public function dashboard(Request $request, Response $response): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'dashboard');
        return JsonResponse::send($response, $this->service->adminDashboard());
    }

    public function rooms(Request $request, Response $response): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'rooms');
        return JsonResponse::send($response, $this->service->adminListRooms());
    }

    public function updateRoom(Request $request, Response $response, array $args): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'rooms');
        return JsonResponse::send($response, $this->service->adminUpdateRoom((int) $args['id'], (array) $request->getParsedBody()));
    }

    public function deleteRoom(Request $request, Response $response, array $args): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'rooms');
        return JsonResponse::send($response, $this->service->adminDeleteRoom((int) $args['id']));
    }

    public function players(Request $request, Response $response): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'players');
        return JsonResponse::send($response, $this->service->adminListPlayers());
    }

    public function updatePlayer(Request $request, Response $response, array $args): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'players');
        return JsonResponse::send($response, $this->service->adminUpdatePlayer((int) $args['id'], (array) $request->getParsedBody()));
    }

    public function deletePlayer(Request $request, Response $response, array $args): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'players');
        return JsonResponse::send($response, $this->service->adminDeletePlayer((int) $args['id']));
    }

    public function users(Request $request, Response $response): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'admins');
        return JsonResponse::send($response, $this->service->adminListUsers());
    }

    public function createUser(Request $request, Response $response): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'admins');
        return JsonResponse::send($response, $this->service->adminCreateUser((array) $request->getParsedBody()), 201);
    }

    public function updateUser(Request $request, Response $response, array $args): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'admins');
        return JsonResponse::send($response, $this->service->adminUpdateUser((int) $args['id'], (array) $request->getParsedBody()));
    }
}
