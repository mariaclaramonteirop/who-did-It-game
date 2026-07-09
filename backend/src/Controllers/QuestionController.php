<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Services\GameService;
use App\Utils\JsonResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class QuestionController
{
    public function __construct(private readonly GameService $service)
    {
    }

    public function list(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        return JsonResponse::send($response, $this->service->listQuestions(($params['includeInactive'] ?? '') === '1'));
    }

    public function create(Request $request, Response $response): Response
    {
        return JsonResponse::send($response, $this->service->createQuestion((array) $request->getParsedBody()), 201);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        return JsonResponse::send($response, $this->service->updateQuestion((int) $args['id'], (array) $request->getParsedBody()));
    }

    public function deactivate(Request $request, Response $response, array $args): Response
    {
        return JsonResponse::send($response, $this->service->setQuestionActive((int) $args['id'], false));
    }
}
