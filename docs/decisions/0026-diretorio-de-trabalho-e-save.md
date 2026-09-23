# 0026 — Diretório de trabalho separado do save, em caminho de cache por plataforma

- Status: aceita
- Data: 2026-09-22

## Contexto

O jogo escreve dois tipos de arquivo com naturezas opostas:

- o **save**, que persiste e é insubstituível ([ADR 0020](0020-autosave-por-quest.md));
- o **material de execução** — fontes gerados, binários compilados e o `GOCACHE`
  pré-aquecido ([ADR 0022](0022-go-versao-cache-e-cgo.md)) — que é inteiramente
  regenerável.

O `GOCACHE` embarcado fica dentro do app, que é somente leitura, então precisa de um
destino gravável. E agora são três plataformas
([ADR 0025](0025-suporte-a-linux-e-macos.md)), cada uma com a sua convenção.

## Decisão

Os dois vão para lugares diferentes, em toda plataforma:

| | Save — persiste | Trabalho — regenerável |
| --- | --- | --- |
| **Windows** | `%APPDATA%\UNIFOR Quest` | `%LOCALAPPDATA%\UNIFOR Quest\run` |
| **macOS** | `~/Library/Application Support/UNIFOR Quest` | `~/Library/Caches/<bundle-id>/run` |
| **Linux** | `~/.config/UNIFOR Quest` | `~/.cache/unifor-quest/run` |

Em código: `app.getPath('userData')` para o save, e
`join(app.getPath('cache'), 'unifor-quest', 'run')` para o trabalho — `cache` não é
escopado por aplicação em nenhuma plataforma, então o nome entra na mão. As variáveis
`XDG_*` são respeitadas pelo Electron no Linux.

Estrutura interna:

```text
run/
├─ go/     cache/   # GOCACHE, semeado a partir do bundle
│          work/    # fontes gerados + binario
├─ java/   work/    # fontes gerados (sem .class, ADR 0023)
└─ ts/     work/
```

**O diretório de trabalho pode desaparecer a qualquer momento** — o macOS limpa
`~/Library/Caches` sob pressão de disco, e limpadores de sistema esvaziam `~/.cache`. O
`Executor` trata cache ausente como estado normal e **re-semeia o `GOCACHE` a partir do
bundle**, com uma verificação barata a cada execução.

## Consequências

- **No Windows, o trabalho não vai para `userData`**, porque `userData` é `%APPDATA%`, ou
  seja, Roaming: em ambiente de domínio, o perfil sincroniza essa pasta no login, e um
  `GOCACHE` ali vira centenas de MB atravessando a rede.
- O caminho de recuperação de cache vazio é **exercitado sempre**, não só na máquina do
  jogador azarado — a verificação roda em toda execução.
- O caminho é **estável e conhecido**, então os artefatos são reaproveitados entre
  execuções, em vez de um diretório novo por rodada. É o melhor caso possível para a
  inspeção de binário recém-criado do Windows Defender
  ([ADR 0021](0021-runtimes-empacotados-no-instalador.md)).
- O save fica isolado de material descartável: o backup do usuário não carrega o cache
  junto, e dá para oferecer "limpar cache" sem qualquer risco ao progresso.
- O `Executor` precisa garantir a árvore de diretórios antes de cada execução, não só na
  primeira.

## Alternativas descartadas

- **Tudo em `userData`:** um caminho só, mas no Windows é Roaming, e mistura o
  insubstituível com o descartável — o save passa a conviver com centenas de MB de cache.
- **Pasta temporária do sistema:** o `GOCACHE` se perderia entre execuções, anulando a
  [ADR 0022](0022-go-versao-cache-e-cgo.md), e binário novo em caminho novo a cada rodada é
  o pior caso para o Defender.
- **Um diretório dentro do próprio app:** somente leitura, e no macOS o bundle é assinado —
  escrever lá quebraria a assinatura.
