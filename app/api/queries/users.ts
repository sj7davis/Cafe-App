// Stub — user queries not used in SaaS platform
export async function findUserByUnionId(unionId: string) { return null; }
export async function upsertUser(data: any) { return { id: 1, ...data }; }
