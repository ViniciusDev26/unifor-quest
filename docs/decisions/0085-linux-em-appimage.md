# 0085 — O jogo sai para Linux como AppImage

- Status: aceita
- Data: 2026-11-20
- Resolve o formato no Linux da [questão 1](../open-questions.md) e o card #37

## Contexto

A questão 1 listava três formatos para Linux: AppImage, `.deb` e tarball. Snap e Flatpak
estavam fora desde o começo, porque os sandboxes deles restringem criar processos e executar
binários recém-escritos, e isso é o funcionamento normal do jogo: ele compila e roda o
código do jogador.

## Decisão

**Um AppImage x64**, configurado em `electron-builder.yml`.

- **Um arquivo só,** que roda em qualquer distro recente sem instalar nada. Quem joga numa
  máquina do laboratório da universidade não precisa de `sudo`.
- **Os runtimes ficam dentro do AppImage, só para leitura.** Tudo o que o jogo escreve vai
  para o diretório de cache ([0026](0026-diretorio-de-trabalho-e-save.md)). O AppImage monta
  num caminho novo a cada execução, por isso os scripts do Erlang foram feitos relocáveis
  ([0082](0082-runtimes-baixados-com-checksum.md)).
- **Integração com a área de trabalho:** `desktopName` e `syncDesktopName` ligam a janela à
  entrada `.desktop`, e o nome e a descrição saem em português.
- **O README** diz como dar permissão de execução e o que a distro precisa ter.

## Consequências

- **Requisitos do sistema:**
  - glibc 2.34 ou mais nova, por causa do Erlang da Hex ([0082](0082-runtimes-baixados-com-checksum.md));
  - `libtinfo6`;
  - OpenSSL 3;
  - `libfuse2`, para montar o AppImage.

  Isso cobre Ubuntu 22.04, Debian 12, Fedora 36 e posteriores. Algumas distros não instalam
  a `libfuse2` por padrão, e o README diz como instalar.
- **O sandbox do Chromium:** a entrada `.desktop` que o electron-builder gera já abre com
  `--no-sandbox`. Abrindo o arquivo direto, o Ubuntu 24.04 pode recusar o sandbox (restrição
  do AppArmor a namespaces sem privilégio), e o README indica `--no-sandbox`.
- **Não há atualização automática,** nem integração com o gerenciador de pacotes: uma versão
  nova é um arquivo novo baixado do release.
- **O AppImage tem cerca de 630 MB,** quase tudo runtimes ([0045](0045-tamanho-do-pacote-nao-e-restricao.md)).
- **Testado neste formato:** o app empacotado roda as cinco linguagens e os quatro servidores
  de linguagem com `PATH=/usr/bin:/bin`, e também sem rede no primeiro uso
  ([0083](0083-caches-pre-aquecidos-no-instalador.md)).

## Alternativas descartadas

- **`.deb`:** pede `sudo` e cobre só Debian e derivados. Pode entrar depois, como segundo
  alvo, sem mudar o resto.
- **Tarball:** funciona em qualquer distro, mas sem ícone nem entrada no menu, e o jogador
  ainda precisa achar o executável.
- **Snap e Flatpak:** os sandboxes bloqueiam o que o jogo faz.
