# WireguardTGBot
Это бот для управления WireGuard core (Созданный на коленке часа за 3)

## Установка
`git clone https://github.com/Jomia156/WireguardTGBot.git`

`cd WireguardTGBot`

`mkdir clients`

`npm install`

## Настройка
### .env

* ENV_MODE=PROD

### .env.production

* TOKEN=Токен бота телеграмм 

* wgParams=Путь к файлу параметров WireGuard `(/etc/wireguard/params)`

* wgConf=Путь к файлу конфигурации Wireguard `(/etc/wireguard/wg0.conf)`

* peersDir=Путь к папке с файлами пользователей. `(/root/WireguardTGBot/clients)`

## Запуск 

`npm run`
