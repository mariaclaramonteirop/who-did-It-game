<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\GameService;
use App\Utils\JsonResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class RoundController
{
    public function __construct(private readonly GameService $service)
    {
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        $account = $this->service->requirePlayerSession($request->getHeaderLine('Authorization'));
        return JsonResponse::send($response, $this->service->getRound((int) $args['id'], $account));
    }

    public function vote(Request $request, Response $response, array $args): Response
    {
        $this->service->requirePlayerSession($request->getHeaderLine('Authorization'));
        return JsonResponse::send($response, $this->service->registerVote((int) $args['id'], (array) $request->getParsedBody()), 201);
    }

    public function result(Request $request, Response $response, array $args): Response
    {
        $account = $this->service->requirePlayerSession($request->getHeaderLine('Authorization'));
        return JsonResponse::send($response, $this->service->getRoundResult((int) $args['id'], $account));
    }
}
