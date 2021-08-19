import { useEffect } from "react";
import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      await api.get(`/stock/${productId}`).then(async (response) => {
        const productInStock = response.data;
        console.log(response);
        if (productInStock.amount > 0) {
          await api.get(`/products/${productId}`).then((response) => {
            const product = response.data;
            let newCart = [...cart];
            let indexProduct = newCart.findIndex(
              (item) => item.id === productId
            );
            if (indexProduct !== -1) {
              if (productInStock.amount > newCart[indexProduct].amount) {
                // ja esta no carrinho
                newCart[indexProduct].amount += 1;
                setCart(newCart);
                localStorage.setItem(
                  "@RocketShoes:cart",
                  JSON.stringify(newCart)
                );
              } else {
                toast.error("Quantidade solicitada fora de estoque");
              }
            } else {
              // nao esta no carrinho
              setCart([...newCart, { ...product, amount: 1 }]);
              localStorage.setItem(
                "@RocketShoes:cart",
                JSON.stringify([...newCart, { ...product, amount: 1 }])
              );
            }
          });
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      });
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      let newCart = [...cart];
      const idx = newCart.findIndex((item: Product) => item.id === productId);
      if (idx === -1) {
        // produto nao existe
        toast.error("Erro na remoção do produto");
      } else {
        // produto existe e pode ser removido
        newCart.splice(idx, 1);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        setCart(newCart);
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;
      await api.get(`/stock/${productId}`).then((response) => {
        const productInStock = response.data;
        if (productInStock.amount >= amount) {
          const newCart = cart.map((item: Product) =>
            item.id === productId ? { ...item, amount: amount } : item
          );
          setCart(newCart);
          localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        } else {
          toast.error("Quantidade solicitada fora de estoque");
        }
      });
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
