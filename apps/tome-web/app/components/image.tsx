/* eslint-disable jsx-a11y/alt-text */
import { ComponentPropsWithoutRef, useState } from 'react';

import { IMAGE_COMPRESS_EXTENSIONS, IMAGE_COMPRESS_FORMATS, IMAGE_SIZE_VARIANTS } from '../lib/image';

interface ImageProps extends Omit<ComponentPropsWithoutRef<'img'>, 'srcSet' | 'sizes'> {
	/** Width the image is intended to be rendered to the screen. Used to infer ideal sizes for images
	 *  @example 100vw
	 *  @example 50vh
	 *  @example 100px
	 */
	srcWidth: string;
}

const convertRegexp = new RegExp(`(${IMAGE_COMPRESS_EXTENSIONS.join('|')})$`);
const largest = (IMAGE_SIZE_VARIANTS.at(0) ?? 0) * 2;

export const Sources = ({ src, srcWidth }: { src: string; srcWidth: string }) => {
	return (
		<>
			{IMAGE_COMPRESS_FORMATS.map(format => {
				return (
					<source
						key={format}
						type={`image/${format}`}
						srcSet={IMAGE_SIZE_VARIANTS.map(size => `${src.replace(convertRegexp, `_${size}.${format}`)} ${size}w`)
							.concat(`${src.replace(convertRegexp, `.${format}`)} ${largest}w`)
							.join(',')}
						sizes={srcWidth}
					/>
				);
			})}
		</>
	);
};

const endsWithOneOf = (str: string, suffixes: string[]) => {
	return suffixes.some(suffix => str.endsWith(suffix));
};

export const Image = ({ alt, src, srcWidth, ...props }: ImageProps) => {
	const [isError, setIsError] = useState(false);

	if (isError) return null;

	return (
		<picture
			{...props}
			onError={() => {
				setIsError(true);
			}}
		>
			{import.meta.env.MODE !== 'development' && src && endsWithOneOf(src, IMAGE_COMPRESS_EXTENSIONS) && (
				<Sources srcWidth={srcWidth} src={src} />
			)}
			<img src={src} alt={alt} />
		</picture>
	);
};
