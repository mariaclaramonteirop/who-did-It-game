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
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'questions');
        return JsonResponse::send($response, $this->service->createQuestion((array) $request->getParsedBody()), 201);
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'questions');
        return JsonResponse::send($response, $this->service->updateQuestion((int) $args['id'], (array) $request->getParsedBody()));
    }

    public function deactivate(Request $request, Response $response, array $args): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'questions');
        return JsonResponse::send($response, $this->service->setQuestionActive((int) $args['id'], false));
    }

    public function import(Request $request, Response $response): Response
    {
        $this->service->requireAdmin($request->getHeaderLine('Authorization'), 'questions');
        $questions = $this->extractQuestions($request);
        return JsonResponse::send($response, $this->service->importQuestions($questions), 201);
    }

    private function extractQuestions(Request $request): array
    {
        $uploaded = $request->getUploadedFiles();
        if (isset($uploaded['file'])) {
            $file = $uploaded['file'];
            $contents = (string) $file->getStream();
            $name = strtolower($file->getClientFilename() ?? '');
            if (str_ends_with($name, '.csv')) {
                return $this->service->parseQuestionsCsv($contents);
            }
            if (str_ends_with($name, '.json')) {
                $decoded = json_decode($contents, true);
                if (!is_array($decoded)) {
                    throw new \App\Exceptions\HttpException(422, 'Arquivo JSON invalido.');
                }
                return $decoded;
            }

            throw new \App\Exceptions\HttpException(422, 'Use um arquivo CSV ou JSON.');
        }

        $body = (array) $request->getParsedBody();
        if (isset($body['csv'])) {
            return $this->service->parseQuestionsCsv((string) $body['csv']);
        }
        if (isset($body['questions']) && is_array($body['questions'])) {
            return $body['questions'];
        }

        throw new \App\Exceptions\HttpException(422, 'Envie um arquivo ou um JSON com questions.');
    }
}
