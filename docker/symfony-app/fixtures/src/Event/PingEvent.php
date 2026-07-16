<?php

namespace App\Event;

class PingEvent
{
    public function __construct(public string $message)
    {
    }
}
