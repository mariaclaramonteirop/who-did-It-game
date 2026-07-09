<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\GameService;
use App\Utils\JsonResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class RoomController
{
    public function __construct(private readonly GameService $service)
    {
    }

    public function create(Request $request, Response $response): Response
    {
        return JsonResponse::send($response, $this->service->createRoom((array) $request->getParsedBody()), 201);
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        return JsonResponse::send($response, $this->service->getRoom($args['code']));
    }

    public function addPlayer(Request $request, Response $response, array $args): Response
    {
        return JsonResponse::send($response, $this->service->addPlayer($args['code'], (array) $request->getParsedBody()), 201);
    }

    public function start(Request $request, Response $response, array $args): Response
    {
        return JsonResponse::send($response, $this->service->startRoom($args['code']));
    }

    public function createRound(Request $request, Response $response, array $args): Response
    {
        return JsonResponse::send($response, $this->service->createRound($args['code']), 201);
    }

    public function ranking(Request $request, Response $response, array $args): Response
    {
        return JsonResponse::send($response, $this->service->ranking($args['code']));
    }
}
