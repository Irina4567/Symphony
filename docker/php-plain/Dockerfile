FROM php:8.3-cli-alpine

# Непривилегированный пользователь — код ученика не должен уметь ничего,
# кроме как читать свой файл и писать в stdout/stderr.
RUN adduser -D -H -u 10001 runner
USER runner

WORKDIR /app
