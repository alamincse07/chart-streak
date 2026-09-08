export const  formatPrice = (amounts:number) =>{
    const amount = Number(amounts); // make sure it's a number, in case it's a stringamount

    if (amount >= 10000000) {
      return `${(amount / 10000000).toFixed(2).replace(/\.00$/, '')} Crore`;
    }
  
    if (amount >= 100000) {
      return `${(amount / 100000).toFixed(2).replace(/\.00$/, '')} Lac`;
    }
  
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2).replace(/\.00$/, '')}K`;
    }
  
    return amount.toString();
  }