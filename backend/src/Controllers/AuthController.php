<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\GameService;
use App\Utils\JsonResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AuthController
{
    public function __construct(private readonly GameService $service)
    {
    }

    public function login(Request $request, Response $response): Response
    {
        return JsonResponse::send($response, $this->service->playerLogin((array) $request->getParsedBody()));
    }

    public function register(Request $request, Response $response): Response
    {
        return JsonResponse::send($response, $this->service->playerRegister((array) $request->getParsedBody()), 201);
    }

    public function me(Request $request, Response $response): Response
    {
        $account = $this->service->requirePlayerSession($request->getHeaderLine('Authorization'));
        return JsonResponse::send($response, [
            'id' => (int) $account['id'],
            'username' => $account['username'],
            'email' => $account['email'],
            'name' => $account['name'],
            'createdAt' => $account['created_at'] ?? null,
            'updatedAt' => $account['updated_at'] ?? null,
        ]);
    }

    public function updateMe(Request $request, Response $response): Response
    {
        $account = $this->service->requirePlayerSession($request->getHeaderLine('Authorization'));
        return JsonResponse::send($response, $this->service->playerUpdateProfile((array) $request->getParsedBody(), $account));
    }
}
