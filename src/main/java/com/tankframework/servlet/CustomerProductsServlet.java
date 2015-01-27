package com.tankframework.servlet;

import com.tankframework.bean.Customer;
import com.tankframework.bean.Product;

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class CustomerProductsServlet extends RestServlet {

    @Override
    protected Object process(HttpServletRequest request) {
        Map<String, Object> values = new HashMap<String, Object>();
        Customer customer = new Customer();
        customer.setFirstName("Jack");
        customer.setLastName("Nicholson");
        customer.setSerialNumber("0001-4934362727");
        values.put("customer", customer);
        Product product = new Product();
        product.setCode("PC1353");
        product.setType("premium");
        List<String> productTypes = new ArrayList<String>();
        productTypes.add("free");
        productTypes.add("premium");
        product.setTypes(productTypes);
        values.put("product", product);
        return values;
    }
}
