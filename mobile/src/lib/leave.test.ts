import { leave } from './leave';

const fakeRouter = (canGoBack: boolean) =>
  ({ canGoBack: jest.fn(() => canGoBack), back: jest.fn(), replace: jest.fn() }) as never as Parameters<
    typeof leave
  >[0] & {
    back: jest.Mock;
    replace: jest.Mock;
  };

describe('leave', () => {
  it('goes back when there is a screen behind this one', () => {
    const router = fakeRouter(true);
    leave(router);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('goes to the debts when there is nothing behind it, as after opening a link', () => {
    const router = fakeRouter(false);
    leave(router);
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
  });
});
