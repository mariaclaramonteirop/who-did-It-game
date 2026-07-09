<?php

declare(strict_types=1);

namespace App\Utils;

use Psr\Http\Message\ResponseInterface as Response;

final class JsonResponse
{
    public static function send(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
