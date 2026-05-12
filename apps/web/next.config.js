//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  distDir: '.next',
  nx: {},
};

const plugins = [
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
