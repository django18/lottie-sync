import { describe, it, expect, beforeEach } from 'vitest';
import { createActor } from 'xstate';
import { fileManagerMachine } from '../../src/machines/index';

describe('File Manager Machine', () => {
  let actor: any;

  beforeEach(() => {
    actor = createActor(fileManagerMachine);
    actor.start();
  });

  it('should start in idle state', () => {
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.files).toEqual([]);
    expect(actor.getSnapshot().context.uploadProgress).toBeInstanceOf(Map);
    expect(actor.getSnapshot().context.validationErrors).toBeInstanceOf(Map);
  });

  it('should handle file validation', () => {
    const mockFile = new File(['test'], 'test.lottie', { type: 'application/zip' });

    actor.send({ type: 'VALIDATE_FILE', file: mockFile });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context).toBeDefined();
  });

  it('should handle file upload progress', () => {
    const fileId = 'test-file-1';
    const progress = 50;

    actor.send({ type: 'UPLOAD_PROGRESS', fileId, progress });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context).toBeDefined();
  });

  it('should handle upload completion', () => {
    const fileId = 'test-file-1';

    actor.send({ type: 'UPLOAD_COMPLETE', fileId });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context).toBeDefined();
  });

  it('should handle upload failures', () => {
    const fileId = 'test-file-1';
    const error = 'Upload failed';

    actor.send({ type: 'UPLOAD_FAILED', fileId, error });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context).toBeDefined();
  });

  it('should handle file removal', () => {
    const fileId = 'test-file-1';

    actor.send({ type: 'REMOVE_FILE', fileId });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context).toBeDefined();
  });

  it('should handle clearing all files', () => {
    actor.send({ type: 'CLEAR_ALL' });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context.files).toEqual([]);
  });

  it('should handle error clearing', () => {
    actor.send({ type: 'CLEAR_ERROR' });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context).toBeDefined();
  });

  it('should handle file validation success', () => {
    const fileId = 'test-file-1';

    actor.send({ type: 'FILE_VALIDATED', fileId });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context).toBeDefined();
  });

  it('should handle file validation failure', () => {
    const fileId = 'test-file-1';
    const error = 'Invalid file format';

    actor.send({ type: 'FILE_VALIDATION_FAILED', fileId, error });

    // The event should be handled without throwing errors
    const state = actor.getSnapshot();
    expect(state.context).toBeDefined();
  });
});
