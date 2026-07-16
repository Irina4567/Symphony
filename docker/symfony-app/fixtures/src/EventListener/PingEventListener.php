<?php

namespace App\EventListener;

use App\Event\PingEvent;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;

class PingEventListener
{
    #[AsEventListener(event: PingEvent::class)]
    public function onPing(PingEvent $event): void
    {
        $event->message .= ' (heard!)';
    }
}
