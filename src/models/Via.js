class Via {
    constructor(
        {
            id,
            nome,
            grau,
            crux,
            artificial,
            duracao,
            exposicao,
            extensao,
            conquistadores,
            detalhes,
            data,
            montanha,
            face,
            fonte,
            imagem,
        }
    ) {
        this.id = id;
        this.nome = nome;
        this.grau = grau;
        this.crux = crux;
        this.artificial = artificial;
        this.duracao = duracao;
        this.exposicao = exposicao;
        this.extensao = extensao;
        this.conquistadores = conquistadores;
        this.detalhes = detalhes;
        this.data = data;
        this.montanha = montanha;
        this.face = face;
        this.fonte = fonte;
        this.imagem = imagem;
    }
}

module.exports = Via;
