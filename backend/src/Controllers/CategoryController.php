<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\GameService;
use App\Utils\JsonResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class CategoryController
{
    public function __construct(private readonly GameService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        return JsonResponse::send($response, $this->service->listCategories(($params['includeInactive'] ?? '') === '1'));
    }

    public function create(Request $request, Response $response): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'categories');
        return JsonResponse::send($response, $this->service->createCategory((array) $request->getParsedBody()), 201);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'categories');
        return JsonResponse::send($response, $this->service->updateCategory((int) $args['id'], (array) $request->getParsedBody()));
    }

    public function deactivate(Request $request, Response $response, array $args): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'categories');
        return JsonResponse::send($response, $this->service->deactivateCategory((int) $args['id']));
    }
}
