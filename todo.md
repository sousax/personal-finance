# Feature: controle financeiro pessoal

- [x] 1. `how` over the affected subsystem. skip: greenfield, nada existente para integrar. Stack copiada de financeiro-mg-capital (Vite + React + TS + Tailwind).
- [x] 2. `architect` for parallel design exploration. skip arena: o único ponto com forma não óbvia é a projeção mensal; sketch único em src/domain/sketch.ts, revisado por mim.
- [x] 3. Write the throughput checkpoint as four todo items.
  - [x] Blocking first steps. Scaffold Vite + schema SQL + domínio puro com testes antes da UI.
  - [x] Independent workstreams. n/a: um app pequeno, UI depende do domínio e do schema.
  - [x] Shared mutable state. n/a: um único delegate escreve no repo.
  - [x] Smallest safe decomposition. Um worker (sonnet) com o sketch como contrato. Dividir UI e domínio entre dois custaria mais em coordenação do que economiza.
- [ ] 4. Delegate code-writing to a subagent using your configured feature model.
- [ ] 5. Verify on the matching surface.
- [ ] 6. Rebase into small, ordered commits. Stack follow-ups.
- [ ] 7. If the design is contested, `interrogate` before shipping. skip: design não contestado.
- [ ] 8. Run **Opening a PR**. skip: repo novo sem remote; deploy no Vercel só com aprovação do usuário.
