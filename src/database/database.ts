import { Mixed } from 'https://deno.land/x/class_mixins@v0.1.3/index.ts';
import { Articles } from './articles.ts';
import { Users } from './users.ts';

class Database extends Mixed(Articles, Users) {}

export { Database };
