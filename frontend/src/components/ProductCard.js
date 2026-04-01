import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ProductCard = ({ product }) => {
  const { getLocalizedName } = useLanguage();

  return (
    <Link
      to={`/products/${product.id}`}
      className="group bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-gray-300"
      data-testid={`product-card-${product.id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image_url}
          alt={getLocalizedName(product)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {product.featured && (
          <span className="absolute top-4 start-4 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-black text-white">
            Featured
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-start line-clamp-1">{getLocalizedName(product)}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
          {product.avg_rating > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Star className="h-4 w-4 fill-yellow-400 stroke-yellow-400" />
              <span>{product.avg_rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
