"use client";

import { useEffect, useState } from "react";

/**
 * Contador de "pessoas vendo agora".
 *
 * Antes era um numero fixo cravado no HTML. Parado, ele denuncia que e
 * enfeite: quem fica alguns segundos na pagina — justamente quem esta
 * decidindo — ve o mesmo 20 o tempo todo e para de acreditar no resto dos
 * indicadores da pagina junto.
 *
 * Agora oscila como uma audiencia real: passos pequenos, nunca um salto de 20
 * para 31, com intervalo irregular entre as mudancas. Sobe e desce em torno da
 * base, sem tendencia — nao e um numero inflando para pressionar, e o que
 * torna a variacao critivel.
 *
 * O primeiro render sai com o valor base, igual no servidor e no cliente, e a
 * oscilacao so comeca depois da montagem — sem isso a hidratacao acusaria
 * divergencia.
 */
export function ViewersCounter({ base }: { base: number }) {
  const [valor, setValor] = useState(base);

  useEffect(() => {
    // Amplitude proporcional a base: ~30% para cima e para baixo.
    const minimo = Math.max(3, Math.round(base * 0.7));
    const maximo = Math.round(base * 1.35);

    let timer: ReturnType<typeof setTimeout>;

    const agendar = () => {
      // Intervalo irregular (3,5s a 9s). Cadencia fixa parece cronometro.
      const espera = 3500 + Math.random() * 5500;

      timer = setTimeout(() => {
        setValor((atual) => {
          // Passo de 1 ou 2 pessoas, com um empurrao de volta ao centro
          // quando ja esta perto das bordas — assim nao gruda no extremo.
          const passo = Math.random() < 0.7 ? 1 : 2;
          const centro = (minimo + maximo) / 2;
          const viesParaCima = atual < centro ? 0.62 : 0.38;
          const direcao = Math.random() < viesParaCima ? 1 : -1;

          return Math.min(maximo, Math.max(minimo, atual + passo * direcao));
        });
        agendar();
      }, espera);
    };

    agendar();
    return () => clearTimeout(timer);
  }, [base]);

  // tabular-nums: sem isso a largura muda a cada digito e o bloco treme.
  return <strong className="block tabular-nums">{valor} pessoas</strong>;
}
