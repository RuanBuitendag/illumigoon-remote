// One test per user story, in the order of docs/user-stories/README.md.
import { eveningUser } from './evening-user.mjs';
import { lookMaker } from './look-maker.mjs';
import { cornerOwner } from './corner-owner.mjs';
import { otherContexts } from './other-contexts.mjs';

export const stories = [...eveningUser, ...lookMaker, ...cornerOwner, ...otherContexts];
