// src/syncs/user_auth.sync.ts
import { actions, Sync } from "@engine";
import { Requesting, Review, User } from "@concepts";

/* ------------------- Registration: request & responses ------------------- */

export const UserRegistrationRequest: Sync = (
  { request, username, email, password /*, userId*/ },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/User/registerUser",
      username,
      email,
      password,
    }, { request }],
  ),
  then: actions(
    // Just invoke; don't try to use its output in this same sync
    [User.registerUser, { username, email, password }, {}],
  ),
});

export const UserRegistrationResponseSuccess: Sync = ({ request, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/User/registerUser" }, { request }],
    [User.registerUser, {}, { userId }],
  ),
  then: actions(
    [Requesting.respond, { request, userId }, { request }],
  ),
});

export const UserRegistrationResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/User/registerUser" }, { request }],
    [User.registerUser, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }, { request }],
  ),
});

/* ------------------- Authentication: request & responses ------------------- */

export const UserAuthenticationRequest: Sync = (
  { request, usernameOrEmail, password },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/User/authenticateUser",
      usernameOrEmail,
      password,
    }, { request }],
  ),
  then: actions(
    // Invoke only; success/error are handled by separate response syncs
    [User.authenticateUser, { usernameOrEmail, password }, {}],
  ),
});

export const UserAuthenticationResponseSuccess: Sync = (
  { request, userId },
) => ({
  when: actions(
    [Requesting.request, { path: "/User/authenticateUser" }, { request }],
    [User.authenticateUser, {}, { userId }],
  ),
  then: actions(
    [Requesting.respond, { request, userId }, { request }],
  ),
});

export const UserAuthenticationResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/User/authenticateUser" }, { request }],
    [User.authenticateUser, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }, { request }],
  ),
});

/* ------------------- Update email: request & responses ------------------- */

export const UpdateUserEmailRequest: Sync = (
  { request, userId, newEmail },
) => ({
  when: actions(
    [Requesting.request, { path: "/User/updateUserEmail", userId, newEmail }, {
      request,
    }],
  ),
  where: async (frames) => {
    // Ensure target user exists. Bind back to the same symbol 'userId' (no extra rename).
    frames = await frames.query(User._userExists, { userId }, { userId });
    return frames;
  },
  then: actions(
    [User.updateUserEmail, { userId, newEmail }, {}],
  ),
});

export const UpdateUserEmailResponseSuccess: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/User/updateUserEmail" }, { request }],
    [User.updateUserEmail, {}, {}],
  ),
  then: actions(
    [Requesting.respond, {
      request,
      status: "success",
      message: "User email updated successfully.",
    }, { request }],
  ),
});

export const UpdateUserEmailResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/User/updateUserEmail" }, { request }],
    [User.updateUserEmail, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }, { request }],
  ),
});

/* ------------------- Delete user: request & responses ------------------- */

export const DeleteUserRequest: Sync = ({ request, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/User/deleteUser", userId }, { request }],
  ),
  where: async (frames) => {
    // Ensure the user exists
    frames = await frames.query(User._userExists, { userId }, { userId });
    return frames;
  },
  then: actions(
    [User.deleteUser, { userId }, {}],
  ),
});

export const DeleteUserResponseSuccess: Sync = ({ request, userId }) => ({
  when: actions(
    [Requesting.request, { path: "/User/deleteUser", userId }, { request }],
    [User.deleteUser, {}, {}],
  ),
  then: actions(
    // Avoid interpolating a symbol in a template string. Return the id as a field.
    [Requesting.respond, { request, status: "success", userId }, { request }],
  ),
});

export const DeleteUserResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/User/deleteUser" }, { request }],
    [User.deleteUser, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }, { request }],
  ),
});

/* ------------------- Cascades after user deletion ------------------- */

export const CascadeUserDeletion: Sync = ({ userId }) => ({
  when: actions(
    [User.deleteUser, { userId }, {}],
  ),
  then: actions(
    [Review.deleteReviewsByUser, { userId }, {}],
    // (No Localization.clearUserLanguage, per your current codebase)
  ),
});
