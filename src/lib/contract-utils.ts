export const nextContractNr = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const seq = Date.now().toString().slice(-4);
  return `MV-${yyyy}-${seq}`;
};
