/** Remove tudo que nao for digito. */
export const onlyDigits = (v: string) => v.replace(/\D/g, "");

/** Valida CPF pelos dois digitos verificadores. */
export function isValidCpf(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11) return false;
  // Sequencias repetidas (00000000000, 11111111111, ...) passam no calculo mas sao invalidas.
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digit = (upTo: number) => {
    let sum = 0;
    for (let i = 0; i < upTo; i++) {
      sum += Number(cpf[i]) * (upTo + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

/** Formata 12345678901 como 123.456.789-01, truncando o excesso. */
export function formatCpf(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

/** Formata 11999998888 como (11) 99999-8888. */
export function formatPhone(input: string): string {
  const d = onlyDigits(input).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
