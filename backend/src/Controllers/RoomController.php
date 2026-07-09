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
        $account = $this->service->requirePlayerSession($request->getHeaderLine('Authorization'));
        return JsonResponse::send($response, $this->service->createRoom((array) $request->getParsedBody(), $account), 201);
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        $account = $this->service->requirePlayerSession($request->getHeaderLine('Authorization'));
        return JsonResponse::send($response, $this->service->getRoom($args['code'], $account));
    }

    public function addPlayer(Request $request, Response $response, array $args): Response
    {
        return JsonResponse::send($response, $this->service->addPlayer($args['code'], (array) $request->getParsedBody()), 201);
    }

    public function removePlayer(Request $request, Response $response, array $args): Response
    {
        $account = $this->service->requirePlayerSession($request->getHeaderLine('Authorization'));
        return JsonResponse::send(
            $response,
            $this->service->removePlayer($args['code'], (int) $args['id'], $account)
        );
    }

    public function start(Request $request, Response $response, array $args): Response
    {
        $account = $this->service->requirePlayerSession($request->getHeaderLine('Authorization'));
        return JsonResponse::send($response, $this->service->startRoom($args['code'], $account));
    }

    public function createRound(Request $request, Response $response, array $args): Response
    {
        $account = $this->service->requirePlayerSession($request->getHeaderLine('Authorization'));
        return JsonResponse::send($response, $this->service->createRound($args['code'], $account), 201);
    }

    public function ranking(Request $request, Response $response, array $args): Response
    {
        $account = $this->service->requirePlayerSession($request->getHeaderLine('Authorization'));
        return JsonResponse::send($response, $this->service->ranking($args['code'], $account));
    }
}
