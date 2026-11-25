# Coordenadoria de Comunicação UFSM (Mercúrio)

Plugin de publicação: envia álbuns e projetos do LionPhotos direto para o catálogo de fotos do sistema da
Coordenadoria (Mercúrio), pelo protocolo `lionphotos-publish-v1`.

1. No sistema, em **Fotos › Publicar direto do LionPhotos**, crie uma chave de envio e copie.
2. No LionPhotos, instale este plugin (`node tools/build-plugin.js plugins/coordenadoria-ufsm`), escolha os
   álbuns e clique em **Publicar…**.
3. Informe o endereço do sistema (por padrão `http://localhost:8080`) e cole a chave. **Testar a conexão** mostra
   em nome de quem as fotos vão entrar.

Coberturas novas entram como rascunho. Publicar de novo o mesmo álbum atualiza os dados, envia só as fotos novas
ou alteradas e tira do site as que saíram do álbum.
